/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Combobox } from "@headlessui/react";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePopper } from "react-popper";
import { useOutsideClickDetector } from "@plane/hooks";
import { ChevronDownOutline, TickOutline } from "@makeplane/propel/icons";
// plane helpers
// hooks
import { useDropdownKeyDown } from "../hooks/use-dropdown-key-down";
// helpers
import { cn } from "../utils";
// types
import type { ICustomSelectItemProps, ICustomSelectProps } from "./helper";

// Context to share the close handler with option components
const DropdownContext = createContext<() => void>(() => {});

function CustomSelect(props: ICustomSelectProps) {
  const {
    customButtonClassName = "",
    buttonClassName = "",
    placement,
    children,
    className = "",
    customButton,
    disabled = false,
    input = false,
    label,
    maxHeight = "md",
    noChevron = false,
    onChange,
    optionsClassName = "",
    value,
    tabIndex,
  } = props;
  // states
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: placement ?? "bottom-start",
  });

  // On React 19 the trigger button's ref callback can be dropped after a
  // disrupted render, leaving referenceElement null and the popper dead.
  // Recover by locating the trigger button from the container DOM.
  useEffect(() => {
    if (isOpen && !referenceElement && dropdownRef.current) {
      const btn = dropdownRef.current.querySelector<HTMLButtonElement>("button");
      if (btn) setReferenceElement(btn);
    }
  }, [isOpen, referenceElement]);

  // On React 19 the panel div's ref callback can be dropped after a
  // disrupted render, leaving popperElement null forever: popper never runs
  // and the portaled panel renders at the document's default (0,0) corner
  // instead of anchored to the trigger button. Recover by locating the open
  // panel mounted in document.body.
  useEffect(() => {
    if (popperElement) return;
    const find = () => {
      let el: HTMLDivElement | null = null;
      if (referenceElement?.id) {
        el = document.querySelector<HTMLDivElement>(`ul[aria-labelledby="${referenceElement.id}"] > div`);
      }
      if (!el) {
        el = document.querySelector<HTMLDivElement>('ul[data-headlessui-state="open"] > div, ul[data-open] > div');
      }
      if (el) setPopperElement(el);
      return !!el;
    };
    if (isOpen && !find()) {
      const t1 = setTimeout(find, 50);
      const t2 = setTimeout(find, 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen, popperElement, referenceElement]);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    if (referenceElement) referenceElement.focus();
  }, [referenceElement]);

  const closeDropdown = useCallback(() => setIsOpen(false), []);
  const handleKeyDown = useDropdownKeyDown(openDropdown, closeDropdown, isOpen);
  useOutsideClickDetector(dropdownRef, closeDropdown);

  const toggleDropdown = useCallback(() => {
    if (isOpen) closeDropdown();
    else openDropdown();
  }, [closeDropdown, isOpen, openDropdown]);

  return (
    <DropdownContext.Provider value={closeDropdown}>
      <Combobox
        as="div"
        ref={dropdownRef}
        tabIndex={tabIndex}
        value={value}
        onChange={(val) => {
          onChange?.(val);
          closeDropdown();
        }}
        className={cn("relative flex-shrink-0 text-left", className)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      >
        <>
          {customButton ? (
            <Combobox.Button as={React.Fragment}>
              <button
                ref={setReferenceElement}
                type="button"
                className={`flex items-center justify-between gap-1 rounded text-11 ${
                  disabled ? "cursor-not-allowed text-secondary" : "cursor-pointer hover:bg-layer-transparent-hover"
                } ${customButtonClassName}`}
                onClick={toggleDropdown}
              >
                {customButton}
              </button>
            </Combobox.Button>
          ) : (
            <Combobox.Button as={React.Fragment}>
              <button
                ref={setReferenceElement}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-1 rounded border border-strong",
                  {
                    "px-3 py-2 text-13": input,
                    "px-2 py-1 text-11": !input,
                    "cursor-not-allowed text-secondary": disabled,
                    "cursor-pointer hover:bg-layer-transparent-hover": !disabled,
                  },
                  buttonClassName
                )}
                onClick={toggleDropdown}
              >
                {label}
                {!noChevron && !disabled && <ChevronDownOutline className="h-3 w-3" aria-hidden="true" />}
              </button>
            </Combobox.Button>
          )}
        </>
        {isOpen &&
          createPortal(
            <Combobox.Options as="ul" data-prevent-outside-click>
              <div
                className={cn(
                  "z-30 my-1 min-w-48 overflow-y-scroll rounded-md border-[0.5px] border-subtle-1 bg-surface-1 px-2 py-2.5 text-11 whitespace-nowrap focus:outline-none",
                  optionsClassName
                )}
                ref={setPopperElement}
                style={styles.popper}
                {...attributes.popper}
              >
                <div
                  className={cn("space-y-1 overflow-y-scroll", {
                    "max-h-60": maxHeight === "lg",
                    "max-h-48": maxHeight === "md",
                    "max-h-36": maxHeight === "rg",
                    "max-h-28": maxHeight === "sm",
                  })}
                  onClickCapture={(e) => {
                    // React 19 hit-testing sometimes resolves option clicks to this
                    // list container instead of the option elements, so the click
                    // never reaches an option. Resolve the intended option by click
                    // coordinates. CustomSelect.Option accepts arbitrary `children`,
                    // so there is no index to map back to a value list here -- each
                    // Option instead stashes its own `value` on its DOM node (see the
                    // ref callback in `Option` below) and we read it straight off the
                    // matched element.
                    const root = e.currentTarget as HTMLElement;
                    const items = Array.from(root.querySelectorAll<HTMLElement>("li, [role='option']")).filter(
                      (el) => el.getBoundingClientRect().height > 0
                    );
                    const option = items.find((el) => {
                      const r = el.getBoundingClientRect();
                      return (
                        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
                      );
                    });
                    if (!option) return;
                    const hasValue = "__customSelectValue" in option;
                    if (!hasValue) return;
                    const value = (option as any).__customSelectValue;
                    e.preventDefault();
                    e.stopPropagation();
                    onChange?.(value);
                    closeDropdown();
                  }}
                >
                  {children}
                </div>
              </div>
            </Combobox.Options>,
            document.body
          )}
      </Combobox>
    </DropdownContext.Provider>
  );
}

function Option(props: ICustomSelectItemProps) {
  const { children, value, className } = props;
  const closeDropdown = useContext(DropdownContext);

  const handleClick = useCallback(() => {
    // Close dropdown for both new and already-selected options.
    // Use setTimeout to ensure HeadlessUI's onChange handler fires first for new selections.
    // For already-selected options, this ensures the dropdown closes since onChange won't fire.
    setTimeout(() => {
      closeDropdown();
    }, 0);
  }, [closeDropdown]);

  // Stash this option's value directly on its DOM node so the panel's
  // onClickCapture (see CustomSelect above) can resolve React19 mis-hit
  // clicks back to the correct option -- CustomSelect.Option renders
  // arbitrary `children`, so there is no stable index/value list to map
  // click coordinates back to otherwise.
  const setOptionRef = useCallback(
    (node: HTMLLIElement | null) => {
      if (node) (node as any).__customSelectValue = value;
    },
    [value]
  );

  return (
    <Combobox.Option
      as="li"
      ref={setOptionRef}
      value={value}
      className={({ active }) =>
        cn(
          "flex cursor-pointer items-center justify-between gap-2 truncate rounded-sm px-1 py-1.5 text-secondary select-none",
          {
            "bg-layer-transparent-hover": active,
          },
          className
        )
      }
      onClick={handleClick}
    >
      {({ selected }) => (
        <div className="flex w-full items-center justify-between gap-2">
          {children}
          {selected && <TickOutline className="h-3.5 w-3.5 flex-shrink-0" />}
        </div>
      )}
    </Combobox.Option>
  );
}

CustomSelect.Option = Option;

export { CustomSelect };
