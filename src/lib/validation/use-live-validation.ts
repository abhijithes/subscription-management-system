"use client";

import { useState } from "react";
import type { z } from "zod";
import { fieldErrorsOf } from "./field-errors";

type Errors = Record<string, string>;
type Options = { values?: (data: FormData) => unknown };
type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const INSTANT_INPUTS = new Set(["checkbox", "radio", "date"]);

/** A field's key is its name, or `data-field` for controls that are not submitted themselves. */
function keyOf(target: EventTarget): { field: Field; key: string } | null {
  const isField =
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement;
  if (!isField) return null;
  const key = target.dataset.field ?? target.name;
  return key ? { field: target, key } : null;
}

/** Choices and dates are finished the moment they change; text is finished on blur. */
function isInstant(field: Field): boolean {
  return field instanceof HTMLSelectElement || (field instanceof HTMLInputElement && INSTANT_INPUTS.has(field.type));
}

function only(errors: Errors, names: ReadonlySet<string>, keep: boolean): Errors {
  return Object.fromEntries(Object.entries(errors).filter(([name]) => names.has(name) === keep));
}

/**
 * Validates a form with its Zod schema as the user fills it in. A field shows its error once it
 * has been left (or changed, for choices and dates), and the error clears as soon as the value is
 * fixed. Submitting marks every field, and blocks the submit while any error remains.
 */
export function useLiveValidation(schema: z.ZodType, options: Options = {}) {
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const [found, setFound] = useState<Errors>({});

  function validate(form: HTMLFormElement): boolean {
    const data = new FormData(form);
    const parsed = schema.safeParse(options.values ? options.values(data) : Object.fromEntries(data));
    setFound(parsed.success ? {} : fieldErrorsOf(parsed.error));
    return parsed.success;
  }

  const formProps = {
    noValidate: true,
    onBlur(e: React.FocusEvent<HTMLFormElement>) {
      const hit = keyOf(e.target);
      if (!hit) return;
      setShown((current) => new Set(current).add(hit.key));
      validate(e.currentTarget);
    },
    onChange(e: React.ChangeEvent<HTMLFormElement>) {
      const hit = keyOf(e.target);
      if (!hit) return;
      setEdited((current) => new Set(current).add(hit.key));
      if (isInstant(hit.field)) setShown((current) => new Set(current).add(hit.key));
      validate(e.currentTarget);
    },
    onSubmit(e: React.FormEvent<HTMLFormElement>) {
      setShown(new Set(Array.from(e.currentTarget.elements, (el) => keyOf(el)?.key).filter((k): k is string => !!k)));
      setEdited(new Set());
      if (!validate(e.currentTarget)) e.preventDefault();
    },
  };

  /** Errors to show: live ones for fields the user has reached, plus the server's, until edited. */
  function errorsWith(server?: Errors): Errors {
    return { ...only(server ?? {}, edited, false), ...only(found, shown, true) };
  }

  return { formProps, errorsWith };
}
