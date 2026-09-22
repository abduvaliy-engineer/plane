/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState, Fragment, useEffect, useRef } from "react";
import { TwitterPicker } from "react-color";
import { Controller, useForm } from "react-hook-form";
import { usePopper } from "react-popper";
import { AddOutline, CloseOutline, LoadingOutline } from "@makeplane/propel/icons";
import { Popover } from "@headlessui/react";
import { Field } from "@makeplane/propel/components/field";
import { Input, InputGroup } from "@makeplane/propel/components/input";
import type { IIssueLabel } from "@plane/types";
// hooks

// ui
// types
import type { TLabelOperations } from "./root";

type ILabelCreate = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  values: string[];
  labelOperations: TLabelOperations;
  disabled?: boolean;
};

const defaultValues: Partial<IIssueLabel> = {
  name: "",
  color: "#ff0000",
};

export function LabelCreate(props: ILabelCreate) {
  const { workspaceSlug, projectId, issueId, values, labelOperations, disabled = false } = props;
  // state
  const [isCreateToggle, setIsCreateToggle] = useState(false);
  const handleIsCreateToggle = () => setIsCreateToggle(!isCreateToggle);
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  // ref on the whole Popover container so we can recover dropped refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  // bumped on every trigger click so the recovery effects re-run whenever
  // the panel opens or closes (Popover manages its own `open` state, not
  // exposed outside its render-prop, so we can't gate on `isOpen` directly)
  const [openTick, setOpenTick] = useState(0);
  // react hook form
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    setFocus,
  } = useForm<Partial<IIssueLabel>>({
    defaultValues,
  });

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "bottom-start",
    modifiers: [
      {
        name: "preventOverflow",
        options: {
          padding: 12,
        },
      },
    ],
  });

  // On React 19 the trigger button's ref callback can be dropped after a
  // disrupted render, leaving referenceElement null and the popper dead.
  // Recover by locating the trigger button from the container DOM.
  useEffect(() => {
    if (!referenceElement && dropdownRef.current) {
      const btn = dropdownRef.current.querySelector<HTMLButtonElement>("button");
      if (btn) setReferenceElement(btn);
    }
  }, [openTick, referenceElement]);

  // On React 19 the panel div's ref callback can be dropped after a
  // disrupted render, leaving popperElement null forever: popper never runs
  // and the panel renders at the document's default (0,0) corner instead of
  // anchored to the trigger button. Recover by locating the mounted panel
  // (not portaled here, so it lives inside the container DOM).
  useEffect(() => {
    if (popperElement || !dropdownRef.current) return;
    const container = dropdownRef.current;
    const find = () => {
      const el = container.querySelector<HTMLDivElement>(".fixed.z-10 > div");
      if (el) setPopperElement(el);
      return !!el;
    };
    if (!find()) {
      const t1 = setTimeout(find, 50);
      const t2 = setTimeout(find, 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [openTick, popperElement]);

  useEffect(() => {
    if (!isCreateToggle) return;

    setFocus("name");
    reset();
  }, [isCreateToggle, reset, setFocus]);

  const handleLabel = async (formData: Partial<IIssueLabel>) => {
    if (!workspaceSlug || !projectId || isSubmitting) return;

    const labelResponse = await labelOperations.createLabel(workspaceSlug, projectId, formData);
    const currentLabels = [...(values || []), labelResponse.id];
    await labelOperations.updateIssue(workspaceSlug, projectId, issueId, { label_ids: currentLabels });
    handleIsCreateToggle();
    reset(defaultValues);
  };

  return (
    <>
      <div
        className="relative flex flex-shrink-0 cursor-pointer items-center gap-1 rounded-full border border-subtle p-0.5 px-2 text-11 text-tertiary transition-all hover:bg-surface-2 hover:text-secondary"
        onClick={handleIsCreateToggle}
      >
        <div className="flex-shrink-0">
          {isCreateToggle ? <CloseOutline className="h-2.5 w-2.5" /> : <AddOutline className="h-2.5 w-2.5" />}
        </div>
        <div className="flex-shrink-0">{isCreateToggle ? "Cancel" : "New"}</div>
      </div>

      {isCreateToggle && (
        <form className="relative flex items-center gap-x-2 p-1" onSubmit={handleSubmit(handleLabel)}>
          <div>
            <Controller
              name="color"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Popover ref={dropdownRef}>
                  <>
                    <Popover.Button as={Fragment}>
                      <button
                        type="button"
                        ref={setReferenceElement}
                        className="grid place-items-center outline-none"
                        onClick={() => setOpenTick((t) => t + 1)}
                      >
                        {value && value?.trim() !== "" && (
                          <span
                            className="h-5 w-5 rounded-sm"
                            style={{
                              backgroundColor: value ?? "black",
                            }}
                          />
                        )}
                      </button>
                    </Popover.Button>
                    <Popover.Panel className="fixed z-10">
                      <div
                        className="max-w-xs p-2 sm:px-0"
                        ref={setPopperElement}
                        style={styles.popper}
                        {...attributes.popper}
                        onClickCapture={(e) => {
                          // React 19 hit-testing sometimes resolves clicks on
                          // TwitterPicker's color swatches to this outer panel
                          // div instead of the swatch itself, so the click
                          // never reaches react-color's own handler. Resolve
                          // the actual element under the pointer and
                          // re-dispatch a real click on it. Guard against
                          // recursion: only redirect when the resolved
                          // element differs from both the panel and the
                          // original event target.
                          const root = e.currentTarget as HTMLElement;
                          if (e.target !== root) return;
                          const real = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
                          if (!real || real === root) return;
                          e.preventDefault();
                          e.stopPropagation();
                          real.click();
                        }}
                      >
                        <TwitterPicker triangle={"hide"} color={value} onChange={(value) => onChange(value.hex)} />
                      </div>
                    </Popover.Panel>
                  </>
                </Popover>
              )}
            />
          </div>
          <Controller
            control={control}
            name="name"
            rules={{
              required: "This is required",
            }}
            render={({ field: { value, onChange, ref } }) => (
              <Field name="name" invalid={Boolean(errors.name)}>
                <InputGroup size="2xl">
                  <Input
                    size="2xl"
                    id="name"
                    name="name"
                    type="text"
                    value={value ?? ""}
                    onChange={onChange}
                    ref={ref}
                    placeholder="Title"
                    disabled={isSubmitting}
                  />
                </InputGroup>
              </Field>
            )}
          />
          <button
            type="button"
            className="grid place-items-center rounded-sm bg-danger-primary p-1"
            onClick={() => setIsCreateToggle(false)}
            disabled={disabled}
          >
            <CloseOutline className="h-3.5 w-3.5 text-on-color" />
          </button>
          <button
            type="submit"
            className="grid place-items-center rounded-sm bg-success-primary p-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <LoadingOutline className="spin h-3.5 w-3.5 text-on-color" />
            ) : (
              <AddOutline className="h-3.5 w-3.5 text-on-color" />
            )}
          </button>
        </form>
      )}
    </>
  );
}
