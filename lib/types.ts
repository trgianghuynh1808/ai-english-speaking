export interface PronunciationWarning {
  heard: string;
  intended: string;
  tip: string;
}

export interface AnalyzeResponse {
  user_analysis: {
    raw_transcript: string;
    pronunciation_warnings: PronunciationWarning[];
    better_expression: string;
  };
  bot_reply: {
    text: string;
    hidden_scaffolding: {
      ideas: string[];
      sentence_starters: string[];
    };
  };
}

export interface HistoryTurn {
  role: "user" | "bot";
  text: string;
}
