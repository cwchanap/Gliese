use super::types::StoryCatalog;

pub fn story_catalog() -> StoryCatalog {
    StoryCatalog {
        package_id: "empty".to_string(),
        default_locale: "en".to_string(),
        npc_dialogues: Vec::new(),
    }
}
