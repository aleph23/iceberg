use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;

use super::{parse_size_dimensions, ImageProviderAdapter, ImageRequestPayload, ImageResponseData};
use crate::image_generator::types::ImageGenerationRequest;

pub struct PollinationsAdapter;

#[derive(Deserialize)]
struct PollinationsImageResponse {
    data: Vec<PollinationsImageData>,
}

#[derive(Deserialize)]
struct PollinationsImageData {
    #[serde(default)]
    url: Option<String>,
    #[serde(default)]
    b64_json: Option<String>,
}

impl ImageProviderAdapter for PollinationsAdapter {
    fn method(&self) -> String {
        "GET".into()
    }

    fn endpoint(&self, base_url: &str, request: &ImageGenerationRequest) -> String {
        let trimmed = base_url.trim_end_matches('/');
        let prompt_encoded = urlencoding::encode(&request.prompt);
        let model = &request.model;
        
        let advanced = request.advanced_model_settings.as_ref();
        let size_override = request
            .size
            .as_deref()
            .or_else(|| advanced.and_then(|settings| settings.sd_size.as_deref()));
            
        let (width, height) = parse_size_dimensions(size_override, 1024, 1024);
        
        // Quality can be optional depending on your implementation
        let quality = request.quality.as_deref().unwrap_or("medium");

        let mut url = format!("{}/image/{}?model={}&width={}&height={}&quality={}", trimmed, prompt_encoded, model, width, height, quality);

        if let Some(negative_prompt) = advanced
            .and_then(|settings| settings.sd_negative_prompt.as_ref())
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
        {
            let negative_encoded = urlencoding::encode(negative_prompt);
            url.push_str(&format!("&negative_prompt={}", negative_encoded));
        }

        url
    }

    fn required_auth_headers(&self) -> &'static [&'static str] {
        &[]
    }

    fn headers(
        &self,
        api_key: &str,
        extra: Option<&HashMap<String, String>>,
    ) -> HashMap<String, String> {
        let mut headers = HashMap::new();
        headers.insert("Authorization".into(), format!("Bearer {}", api_key));
        headers.insert("Content-Type".into(), "application/json".into());

        if let Some(extra) = extra {
            for (k, v) in extra.iter() {
                headers.insert(k.clone(), v.clone());
            }
        }

        headers
    }

    fn payload(&self, _request: &ImageGenerationRequest) -> Result<ImageRequestPayload, String> {
        Ok(ImageRequestPayload::Json(json!({})))
    }

    fn parse_response(&self, response: Value) -> Result<Vec<ImageResponseData>, String> {
        // Handle specific Pollinations API error responses
        if let Some(error) = response.get("error").and_then(|e| e.as_object()) {
            let message = error.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error");
            let code = error.get("code").and_then(|c| c.as_str()).unwrap_or("ERROR");
            return Err(format!("Pollinations API error ({}): {}", code, message));
        }

        let pollinations_response: PollinationsImageResponse =
            serde_json::from_value(response).map_err(|e| {
                crate::utils::err_msg(
                    module_path!(),
                    line!(),
                    format!("Failed to parse response from Pollinations: {}", e),
                )
            })?;

        Ok(pollinations_response
            .data
            .into_iter()
            .map(|img| ImageResponseData {
                url: img.url,
                b64_json: img.b64_json,
                text: None,
            })
            .collect())
    }
}
