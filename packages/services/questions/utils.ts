import { InsertQuestion, SelectQuestion } from "@repo/database/models/question";
import { CreateQuestionInputModelType, CreateQuestionOutputModelType } from "./model";

export class FormNotFoundError extends Error {
  constructor() {
    super("Form not found or you do not have access to it");
    this.name = "FormNotFoundError";
  }
}

export class QuestionNotCreatedError extends Error {
  constructor() {
    super("Question could not be created");
    this.name = "QuestionNotCreatedError";
  }
}

export class InvalidQuestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidQuestionError";
  }
}

// ─── EDGE CASE VALIDATORS ─────────────────────────────────────────────────────

export function validateQuestionInput(input: CreateQuestionInputModelType): void {
  switch (input.type) {
    case "MULTIPLE_CHOICE": {
      // must have at least 2 choices — one choice is not a multiple choice
      if (input.settings.choices.length < 2) {
        throw new InvalidQuestionError("MULTIPLE_CHOICE must have at least 2 choices");
      }

      // labels must not be blank after trimming
      const blankLabel = input.settings.choices.find((c) => c.label.trim().length === 0);
      if (blankLabel) {
        throw new InvalidQuestionError("Choice labels must not be blank");
      }

      // duplicate labels confuse respondents even if ids are unique
      const labels = input.settings.choices.map((c) => c.label.trim().toLowerCase());
      if (new Set(labels).size !== labels.length) {
        throw new InvalidQuestionError("MULTIPLE_CHOICE choices must have unique labels");
      }

      // maxSelections only makes sense on CHECKBOX not MULTIPLE_CHOICE
      if (input.settings.maxSelections !== undefined) {
        throw new InvalidQuestionError(
          "maxSelections is not valid for MULTIPLE_CHOICE — use CHECKBOX instead",
        );
      }

      break;
    }

    case "CHECKBOX": {
      // same as multiple choice — at least 2 choices
      if (input.settings.choices.length < 2) {
        throw new InvalidQuestionError("CHECKBOX must have at least 2 choices");
      }

      const blankLabel = input.settings.choices.find((c) => c.label.trim().length === 0);
      if (blankLabel) {
        throw new InvalidQuestionError("Choice labels must not be blank");
      }

      const labels = input.settings.choices.map((c) => c.label.trim().toLowerCase());
      if (new Set(labels).size !== labels.length) {
        throw new InvalidQuestionError("CHECKBOX choices must have unique labels");
      }

      // maxSelections must not exceed total choices
      if (
        input.settings.maxSelections !== undefined &&
        input.settings.maxSelections > input.settings.choices.length
      ) {
        throw new InvalidQuestionError(
          `maxSelections (${input.settings.maxSelections}) cannot exceed total choices (${input.settings.choices.length})`,
        );
      }

      // maxSelections of 1 should just be MULTIPLE_CHOICE
      if (input.settings.maxSelections === 1) {
        throw new InvalidQuestionError(
          "maxSelections of 1 is not valid for CHECKBOX — use MULTIPLE_CHOICE instead",
        );
      }

      break;
    }

    case "DROPDOWN": {
      if (input.settings.choices.length < 2) {
        throw new InvalidQuestionError("DROPDOWN must have at least 2 choices");
      }

      const blankLabel = input.settings.choices.find((c) => c.label.trim().length === 0);
      if (blankLabel) {
        throw new InvalidQuestionError("Choice labels must not be blank");
      }

      const labels = input.settings.choices.map((c) => c.label.trim().toLowerCase());
      if (new Set(labels).size !== labels.length) {
        throw new InvalidQuestionError("DROPDOWN choices must have unique labels");
      }

      break;
    }

    case "RATING": {
      // shape "thumb" only makes sense with max 2 (thumbs up/down)
      // but we only support 5 or 10 — so thumb is invalid
      if (input.settings?.shape === "thumb" && input.settings?.max !== undefined) {
        throw new InvalidQuestionError("RATING with shape 'thumb' should use YES_NO instead");
      }

      break;
    }

    case "SCALE": {
      if (input.settings && input.settings.min === input.settings.max) {
        throw new InvalidQuestionError("SCALE min and max cannot be equal");
      }

      if (input.settings && input.settings.min < 0) {
        throw new InvalidQuestionError("SCALE min cannot be negative");
      }

      // step must divide evenly into the range
      if (input.settings) {
        const range = input.settings.max - input.settings.min;
        if (range % input.settings.step !== 0) {
          throw new InvalidQuestionError(
            `SCALE step (${input.settings.step}) must divide evenly into range (${input.settings.min}–${input.settings.max})`,
          );
        }
      }

      break;
    }

    case "DATE": {
      if (input.settings?.minDate && input.settings?.maxDate) {
        const min = new Date(input.settings.minDate);
        const max = new Date(input.settings.maxDate);

        if (isNaN(min.getTime())) {
          throw new InvalidQuestionError("DATE minDate is not a valid date");
        }
        if (isNaN(max.getTime())) {
          throw new InvalidQuestionError("DATE maxDate is not a valid date");
        }
        if (min >= max) {
          throw new InvalidQuestionError("DATE minDate must be before maxDate");
        }
      }

      break;
    }

    case "FILE_UPLOAD": {
      // cap file size to a sane maximum (100mb)
      if (input.settings.maxFileSizeMb > 100) {
        throw new InvalidQuestionError("FILE_UPLOAD maxFileSizeMb cannot exceed 100");
      }

      // cap file count
      if (input.settings.maxFiles > 10) {
        throw new InvalidQuestionError("FILE_UPLOAD maxFiles cannot exceed 10");
      }

      // validate mime type format — must be "type/subtype" or "type/*"
      const invalidMime = input.settings.allowedTypes.find(
        (t) => !/^[a-zA-Z0-9*+-]+\/[a-zA-Z0-9*+.\-]+$/.test(t),
      );
      if (invalidMime) {
        throw new InvalidQuestionError(
          `FILE_UPLOAD allowedTypes contains invalid mime type: "${invalidMime}"`,
        );
      }

      break;
    }

    case "YES_NO": {
      // labels must be different from each other
      const yes = (input.settings?.yesLabel ?? "Yes").trim().toLowerCase();
      const no = (input.settings?.noLabel ?? "No").trim().toLowerCase();

      if (yes === no) {
        throw new InvalidQuestionError("YES_NO yesLabel and noLabel must be different");
      }

      break;
    }

    case "STATEMENT": {
      // button label must not be blank if provided
      if (
        input.settings?.buttonLabel !== undefined &&
        input.settings.buttonLabel.trim().length === 0
      ) {
        throw new InvalidQuestionError("STATEMENT buttonLabel must not be blank");
      }

      break;
    }

    // no edge cases for these — zod handles all structural validation
    case "SHORT_TEXT":
    case "LONG_TEXT":
    case "EMAIL":
    case "PHONE":
      break;
  }
}

// ─── SETTINGS RESOLVER ────────────────────────────────────────────────────────

export function resolveSettings(input: CreateQuestionInputModelType): InsertQuestion["settings"] {
  switch (input.type) {
    case "MULTIPLE_CHOICE":
    case "CHECKBOX":
    case "DROPDOWN":
    case "FILE_UPLOAD":
      return input.settings;

    case "RATING":
      return input.settings ?? { max: 5, shape: "star" };

    case "SCALE":
      return input.settings ?? { min: 1, max: 10, step: 1, minLabel: "Low", maxLabel: "High" };

    case "YES_NO":
      return input.settings ?? { yesLabel: "Yes", noLabel: "No" };

    case "STATEMENT":
      return input.settings ?? { buttonLabel: "OK" };

    case "DATE":
      return input.settings ?? { format: "MM/DD/YYYY", includeTime: false };

    case "SHORT_TEXT":
    case "LONG_TEXT":
    case "EMAIL":
    case "PHONE":
      return null;
  }
}

// ─── MAPPER ───────────────────────────────────────────────────────────────────

export function toOutput(question: SelectQuestion): CreateQuestionOutputModelType {
  return {
    id: question.id,
    formId: question.formId,
    order: question.order,
    type: question.type,
    title: question.title,
    description: question.description ?? null,
    required: question.required,
    settings: question.settings ?? null,
  };
}
