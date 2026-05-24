declare module "word-extractor" {
  type ExtractedDocument = {
    getBody: () => string;
    getFootnotes?: () => string;
    getEndnotes?: () => string;
    getHeaders?: () => string;
  };

  class WordExtractor {
    extract(input: Buffer | string): Promise<ExtractedDocument>;
  }

  export = WordExtractor;
}
