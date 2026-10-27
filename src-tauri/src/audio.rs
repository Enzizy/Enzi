//! Default speaker and microphone volume / mute, via Windows Core Audio.

use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
use windows::Win32::Media::Audio::{eCapture, eConsole, eRender, EDataFlow, IMMDeviceEnumerator, MMDeviceEnumerator};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};

fn endpoint(flow: EDataFlow) -> Option<IAudioEndpointVolume> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let enumerator: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).ok()?;
        let device = enumerator.GetDefaultAudioEndpoint(flow, eConsole).ok()?;
        device.Activate(CLSCTX_ALL, None).ok()
    }
}

fn flow(mic: bool) -> EDataFlow {
    if mic { eCapture } else { eRender }
}

/// (level 0..1, muted)
pub fn get(mic: bool) -> Option<(f32, bool)> {
    let ep = endpoint(flow(mic))?;
    unsafe { Some((ep.GetMasterVolumeLevelScalar().ok()?, ep.GetMute().ok()?.as_bool())) }
}

pub fn set_level(mic: bool, level: f32) -> Option<()> {
    let ep = endpoint(flow(mic))?;
    unsafe {
        ep.SetMasterVolumeLevelScalar(level.clamp(0.0, 1.0), std::ptr::null()).ok()?;
        if level > 0.0 {
            ep.SetMute(false, std::ptr::null()).ok()?;
        }
    }
    Some(())
}

pub fn set_mute(mic: bool, muted: bool) -> Option<()> {
    let ep = endpoint(flow(mic))?;
    unsafe { ep.SetMute(muted, std::ptr::null()).ok() }
}
