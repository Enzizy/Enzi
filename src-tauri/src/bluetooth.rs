//! Pops up when Bluetooth devices (headphones, mice, controllers) connect or disconnect,
//! with the battery level when the device reports one to Windows.

use std::collections::{HashMap, HashSet};
use std::thread;
use std::time::Duration;

use serde_json::json;
use tauri::{AppHandle, Emitter};
use windows::core::{Interface, HSTRING};
use windows::Devices::Bluetooth::{BluetoothConnectionStatus, BluetoothDevice, BluetoothLEDevice};
use windows::Devices::Enumeration::{DeviceInformation, DeviceInformationKind};
use windows::Foundation::Collections::IIterable;
use windows::Foundation::IPropertyValue;
use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};

/// DEVPKEY_Bluetooth_Battery
const BATTERY_KEY: &str = "{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2";

/// id -> name of every connected Bluetooth device (classic and Low Energy).
fn connected() -> HashMap<String, String> {
    let mut out = HashMap::new();
    let selectors = [
        BluetoothDevice::GetDeviceSelectorFromConnectionStatus(BluetoothConnectionStatus::Connected),
        BluetoothLEDevice::GetDeviceSelectorFromConnectionStatus(BluetoothConnectionStatus::Connected),
    ];
    for selector in selectors.into_iter().flatten() {
        let Ok(found) = DeviceInformation::FindAllAsyncAqsFilter(&selector).and_then(|op| op.get()) else { continue };
        for i in 0..found.Size().unwrap_or(0) {
            if let Ok(d) = found.GetAt(i) {
                if let (Ok(id), Ok(name)) = (d.Id(), d.Name()) {
                    out.insert(id.to_string(), name.to_string());
                }
            }
        }
    }
    out
}

/// Battery percentage reported for a device, matched by name (best effort).
fn battery_for(name: &str) -> Option<u8> {
    let props: IIterable<HSTRING> = vec![HSTRING::from(BATTERY_KEY)].try_into().ok()?;
    let aqs = HSTRING::from(r#"System.Devices.DeviceInstanceId:~~"BTHENUM" OR System.Devices.DeviceInstanceId:~~"BTHLE""#);
    let found = DeviceInformation::FindAllAsyncWithKindAqsFilterAndAdditionalProperties(
        &aqs,
        &props,
        DeviceInformationKind::Device,
    )
    .ok()?
    .get()
    .ok()?;
    let key = HSTRING::from(BATTERY_KEY);
    let target = name.to_lowercase();
    for i in 0..found.Size().unwrap_or(0) {
        let Ok(d) = found.GetAt(i) else { continue };
        let dev_name = d.Name().map(|n| n.to_string().to_lowercase()).unwrap_or_default();
        if !(dev_name.starts_with(&target) || target.starts_with(&dev_name)) || dev_name.is_empty() {
            continue;
        }
        let value = d.Properties().ok().and_then(|p| p.Lookup(&key).ok());
        if let Some(level) = value.and_then(|v| v.cast::<IPropertyValue>().ok()).and_then(|v| v.GetUInt8().ok()) {
            return Some(level);
        }
    }
    None
}

pub fn start(app: AppHandle) {
    thread::spawn(move || {
        let _ = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
        let mut known: HashMap<String, String> = connected();
        loop {
            thread::sleep(Duration::from_secs(4));
            let now = connected();
            let before: HashSet<&String> = known.keys().collect();
            let after: HashSet<&String> = now.keys().collect();
            for id in after.difference(&before) {
                let name = &now[*id];
                // Give Windows a moment to read the battery after connecting.
                thread::sleep(Duration::from_millis(1500));
                let battery = battery_for(name);
                let _ = app.emit_to("notch", "indicator", json!({ "kind": "bluetooth", "name": name, "connected": true, "battery": battery }));
            }
            for id in before.difference(&after) {
                let name = &known[*id];
                let _ = app.emit_to("notch", "indicator", json!({ "kind": "bluetooth", "name": name, "connected": false }));
            }
            known = now;
        }
    });
}
