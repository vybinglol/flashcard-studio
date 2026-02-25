use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

// ── Data Structures ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Flashcard {
    pub id: String,
    pub question: String,
    pub answer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Deck {
    pub name: String,
    pub cards: Vec<Flashcard>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
    format: String,
    options: OllamaOptions,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaOptions {
    temperature: f32,
    num_predict: i32,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaResponse {
    response: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeneratedCards {
    cards: Vec<GeneratedCard>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeneratedCard {
    question: String,
    answer: String,
}

// ── LLM Command ──────────────────────────────────────────────────

#[tauri::command]
async fn generate_flashcards(text: String, model: String) -> Result<Vec<Flashcard>, String> {
    let prompt = format!(
        r#"You are a flashcard generator. Analyze the following text and create high-quality study flashcards.

Rules:
- Extract the most important concepts, facts, and relationships.
- Each flashcard must have a clear, specific question and a concise, accurate answer.
- Aim for 5-15 flashcards depending on content density.
- Questions should test understanding, not just recall.
- Answers should be brief but complete.

Respond with ONLY valid JSON in this exact format:
{{"cards": [{{"question": "...", "answer": "..."}}, ...]}}

Text to analyze:
{text}"#
    );

    let model_name = if model.is_empty() {
        "mistral".to_string()
    } else {
        model
    };

    let request = OllamaRequest {
        model: model_name,
        prompt,
        stream: false,
        format: "json".to_string(),
        options: OllamaOptions {
            temperature: 0.3,
            num_predict: 4096,
        },
    };

    let client = reqwest::Client::new();
    let response = client
        .post("http://localhost:11434/api/generate")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama. Is it running?\n{}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama returned status: {}", response.status()));
    }

    let ollama_resp: OllamaResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    let generated: GeneratedCards = serde_json::from_str(&ollama_resp.response)
        .map_err(|e| format!("LLM returned invalid JSON. Try regenerating.\n{}", e))?;

    let cards = generated
        .cards
        .into_iter()
        .map(|c| Flashcard {
            id: Uuid::new_v4().to_string(),
            question: c.question,
            answer: c.answer,
        })
        .collect();

    Ok(cards)
}

#[tauri::command]
async fn check_ollama() -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|_| "Cannot connect to Ollama".to_string())?;

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|_| "Invalid response from Ollama".to_string())?;

    let models: Vec<String> = body["models"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|m| m["name"].as_str().map(|s| s.to_string()))
        .collect();

    Ok(models)
}

// ── File I/O Commands ────────────────────────────────────────────

#[tauri::command]
fn save_deck(path: String, deck: Deck) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&deck)
        .map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to save: {}", e))?;
    Ok(())
}

#[tauri::command]
fn load_deck(path: String) -> Result<Deck, String> {
    let data = fs::read_to_string(&path).map_err(|e| format!("Failed to read: {}", e))?;
    let deck: Deck =
        serde_json::from_str(&data).map_err(|e| format!("Invalid deck file: {}", e))?;
    Ok(deck)
}

#[tauri::command]
fn get_default_deck_dir() -> Result<String, String> {
    let dir = dirs_next().ok_or("Cannot determine home directory")?;
    let deck_dir = dir.join("FlashcardDecks");
    if !deck_dir.exists() {
        fs::create_dir_all(&deck_dir).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    Ok(deck_dir.to_string_lossy().to_string())
}

fn dirs_next() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
    #[cfg(target_os = "linux")]
    {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").ok().map(PathBuf::from)
    }
}

// ── App Entry ────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            generate_flashcards,
            check_ollama,
            save_deck,
            load_deck,
            get_default_deck_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
