#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct ThinkingSplit {
    pub content: String,
    pub reasoning: String,
}

impl ThinkingSplit {
    pub fn merge_reasoning(mut self, explicit_reasoning: Option<&str>) -> Self {
        if let Some(reasoning) = explicit_reasoning
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            if self.reasoning.trim().is_empty() {
                self.reasoning = reasoning.to_string();
            } else if self.reasoning.trim() != reasoning {
                self.reasoning.push_str("\n\n");
                self.reasoning.push_str(reasoning);
            }
        }
        self
    }
}

#[derive(Debug, Default, Clone)]
pub struct ThinkingTagStreamParser {
    in_think: bool,
    pending: String,
}

const OPEN_TAG: &str = "<think>";
const CLOSE_TAG: &str = "</think>";

fn partial_suffix_len(buffer: &str, tag: &str) -> usize {
    let max_len = buffer.len().min(tag.len().saturating_sub(1));
    for len in (1..=max_len).rev() {
        if tag.starts_with(&buffer[buffer.len() - len..]) {
            return len;
        }
    }
    0
}

impl ThinkingTagStreamParser {
    pub fn feed(&mut self, chunk: &str) -> ThinkingSplit {
        self.pending.push_str(chunk);
        let mut split = ThinkingSplit::default();

        loop {
            if self.in_think {
                if let Some(index) = self.pending.find(CLOSE_TAG) {
                    split.reasoning.push_str(&self.pending[..index]);
                    self.pending.drain(..index + CLOSE_TAG.len());
                    self.in_think = false;
                    continue;
                }

                let keep = partial_suffix_len(&self.pending, CLOSE_TAG);
                let emit_len = self.pending.len().saturating_sub(keep);
                if emit_len == 0 {
                    break;
                }
                split.reasoning.push_str(&self.pending[..emit_len]);
                self.pending.drain(..emit_len);
                break;
            }

            if let Some(index) = self.pending.find(OPEN_TAG) {
                split.content.push_str(&self.pending[..index]);
                self.pending.drain(..index + OPEN_TAG.len());
                self.in_think = true;
                continue;
            }

            let keep = partial_suffix_len(&self.pending, OPEN_TAG);
            let emit_len = self.pending.len().saturating_sub(keep);
            if emit_len == 0 {
                break;
            }
            split.content.push_str(&self.pending[..emit_len]);
            self.pending.drain(..emit_len);
            break;
        }

        split
    }

    pub fn finish(&mut self) -> ThinkingSplit {
        let mut split = ThinkingSplit::default();
        if self.in_think {
            split.reasoning.push_str(&self.pending);
        } else {
            split.content.push_str(&self.pending);
        }
        self.pending.clear();
        split
    }
}

pub fn split_thinking_tags(text: &str) -> ThinkingSplit {
    let mut parser = ThinkingTagStreamParser::default();
    let mut split = parser.feed(text);
    let tail = parser.finish();
    split.content.push_str(&tail.content);
    split.reasoning.push_str(&tail.reasoning);
    split
}

pub fn normalize_thinking_content(
    content: Option<&str>,
    explicit_reasoning: Option<&str>,
) -> ThinkingSplit {
    let mut split = content
        .map(split_thinking_tags)
        .unwrap_or_default()
        .merge_reasoning(explicit_reasoning);

    split.content = split.content.trim().to_string();
    split.reasoning = split.reasoning.trim().to_string();
    split
}

#[cfg(test)]
mod tests {
    use super::{normalize_thinking_content, split_thinking_tags, ThinkingTagStreamParser};

    #[test]
    fn splits_complete_think_block() {
        let split = split_thinking_tags("Hello<think>hidden</think>world");
        assert_eq!(split.content, "Helloworld");
        assert_eq!(split.reasoning, "hidden");
    }

    #[test]
    fn splits_streamed_think_block_with_fragmented_tags() {
        let mut parser = ThinkingTagStreamParser::default();

        let a = parser.feed("Hello<th");
        let b = parser.feed("ink>hid");
        let c = parser.feed("den</th");
        let d = parser.feed("ink>world");
        let tail = parser.finish();

        assert_eq!(a.content, "Hello");
        assert_eq!(a.reasoning, "");
        assert_eq!(b.content, "");
        assert_eq!(b.reasoning, "hid");
        assert_eq!(c.reasoning, "den");
        assert_eq!(d.content, "world");
        assert_eq!(tail.content, "");
        assert_eq!(tail.reasoning, "");
    }

    #[test]
    fn merges_explicit_reasoning_with_tag_reasoning_without_duplication() {
        let split = normalize_thinking_content(Some("<think>alpha</think>done"), Some("alpha"));
        assert_eq!(split.content, "done");
        assert_eq!(split.reasoning, "alpha");
    }
}
