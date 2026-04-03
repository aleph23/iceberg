use std::collections::HashMap;

use serde_json::{json, Value};

use super::{ProviderAdapter, ModelInfo};
use crate::chat_manager::tooling::ToolConfig;

pub struct PollinationsTextAdapter;

impl ProviderAdapter for PollinationsTextAdapter {
    fn endpoint(&self, base_url: &str) -> String {
        let trimmed = base_url.trim_end_matches('/');
        if trimmed.ends_with("/v1") {
            format!("{}/chat/completions", trimmed)
        } else {
            format!("{}/v1/chat/completions", trimmed)
        }
    }

    fn system_role(&self) -> std::borrow::Cow<'static, str> {
        "system".into()
    }

    fn required_auth_headers(&self) -> &'static [&'static str] {
        &["Authorization"]
    }

    fn default_headers_template(&self) -> HashMap<String, String> {
        let mut out = HashMap::new();
        out.insert("Content-Type".into(), "application/json".into());
        out.insert("Authorization".into(), "Bearer <apiKey>".into());
        out.insert("Accept".into(), "text/event-stream".into());
        out
    }

    fn headers(
        &self,
        api_key: &str,
        extra: Option<&HashMap<String, String>>,
    ) -> HashMap<String, String> {
        let mut out: HashMap<String, String> = HashMap::new();
        out.insert("Content-Type".into(), "application/json".into());
        out.insert("Authorization".into(), format!("Bearer {}", api_key));
        out.insert("Accept".into(), "text/event-stream".into());
        out.entry("User-Agent".into())
            .or_insert_with(|| "LettuceAI/0.1".into());
        if let Some(extra) = extra {
            for (k, v) in extra.iter() {
                out.insert(k.clone(), v.clone());
            }
        }
        out
    }

    fn body(
        &self,
        model_name: &str,
        messages_for_api: &Vec<Value>,
        _system_prompt: Option<String>,
        temperature: Option<f64>,
        top_p: Option<f64>,
        max_tokens: u32,
        context_length: Option<u32>,
        should_stream: bool,
        frequency_penalty: Option<f64>,
        presence_penalty: Option<f64>,
        _top_k: Option<u32>,
        tool_config: Option<&ToolConfig>,
        reasoning_enabled: bool,
        reasoning_effort: Option<String>,
        reasoning_budget: Option<u32>,
    ) -> Value {
        crate::chat_manager::provider_adapter::openai::OpenAIAdapter.body(
            model_name,
            messages_for_api,
            _system_prompt,
            temperature,
            top_p,
            max_tokens,
            context_length,
            should_stream,
            frequency_penalty,
            presence_penalty,
            _top_k,
            tool_config,
            reasoning_enabled,
            reasoning_effort,
            reasoning_budget,
        )
    }

    fn list_models_endpoint(&self, base_url: &str) -> String {
        let base = base_url.trim_end_matches('/');
        format!("{}/v1/models", base) // Pollinations standard endpoint for models
    }

    fn parse_models_list(&self, response: Value) -> Vec<ModelInfo> {
        let mut models = Vec::new();

        // Support both direct array AND { data: [...] } OpenAI format
        let arr = if let Some(arr) = response.as_array() {
            Some(arr)
        } else {
            response.get("data").and_then(|d| d.as_array())
        };

        if let Some(data) = arr {
            for item in data {
                let id_opt = item.get("id").and_then(|id| id.as_str());
                let name_opt = item.get("name").and_then(|n| n.as_str());
                let description_opt = item.get("description").and_then(|d| d.as_str()).map(|s| s.to_string());
                
                let actual_id = id_opt.or(name_opt);
                
                if let Some(id) = actual_id {
                    // Try to extract pricing info if provided
                    
                    models.push(ModelInfo {
                        id: id.to_string(),
                        display_name: description_opt.clone().or_else(|| name_opt.map(|s| s.to_string())),
                        description: description_opt,
                        context_length: item.get("context_length").and_then(|c| c.as_u64()),
                        input_price: None,
                        output_price: None,
                    });
                }
            }
        }
        models
    }
}

pub struct PollinationsImageAdapter;

impl ProviderAdapter for PollinationsImageAdapter {
    fn endpoint(&self, base_url: &str) -> String {
        PollinationsTextAdapter.endpoint(base_url)
    }

    fn system_role(&self) -> std::borrow::Cow<'static, str> {
        PollinationsTextAdapter.system_role()
    }

    fn required_auth_headers(&self) -> &'static [&'static str] {
        PollinationsTextAdapter.required_auth_headers()
    }

    fn default_headers_template(&self) -> HashMap<String, String> {
        PollinationsTextAdapter.default_headers_template()
    }

    fn headers(
        &self,
        api_key: &str,
        extra: Option<&HashMap<String, String>>,
    ) -> HashMap<String, String> {
        PollinationsTextAdapter.headers(api_key, extra)
    }

    fn body(
        &self,
        _model_name: &str,
        _messages_for_api: &Vec<Value>,
        _system_prompt: Option<String>,
        _temperature: Option<f64>,
        _top_p: Option<f64>,
        _max_tokens: u32,
        _context_length: Option<u32>,
        _should_stream: bool,
        _frequency_penalty: Option<f64>,
        _presence_penalty: Option<f64>,
        _top_k: Option<u32>,
        _tool_config: Option<&ToolConfig>,
        _reasoning_enabled: bool,
        _reasoning_effort: Option<String>,
        _reasoning_budget: Option<u32>,
    ) -> Value {
        json!({})
    }

    fn list_models_endpoint(&self, base_url: &str) -> String {
        let base = base_url.trim_end_matches('/');
        format!("{}/image/models", base)
    }

    fn parse_models_list(&self, response: Value) -> Vec<ModelInfo> {
        PollinationsTextAdapter.parse_models_list(response)
    }
}
