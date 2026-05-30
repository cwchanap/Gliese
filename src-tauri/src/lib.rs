pub mod story;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| Ok(()))
        .invoke_handler(tauri::generate_handler![story::commands::get_npc_dialogue])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
