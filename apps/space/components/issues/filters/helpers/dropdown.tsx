/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { Fragment, useEffect, useRef, useState } from "react";
import type { Placement } from "@popperjs/core";
import { usePopper } from "react-popper";
import { Popover, Transition } from "@headlessui/react";
// ui
import { Button } from "@plane/propel/button";

type Props = {
  children: React.ReactNode;
  title?: string;
  placement?: Placement;
};

export function FiltersDropdown(props: Props) {
  const { children, title = "Dropdown", placement } = props;

  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  // refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: placement ?? "auto",
  });

  return (
    <Popover as="div" ref={dropdownRef}>
      {({ open }) => (
        <FiltersDropdownContent
          open={open}
          title={title}
          dropdownRef={dropdownRef}
          referenceElement={referenceElement}
          setReferenceElement={setReferenceElement}
          popperElement={popperElement}
          setPopperElement={setPopperElement}
          styles={styles}
          attributes={attributes}
        >
          {children}
        </FiltersDropdownContent>
      )}
    </Popover>
  );
}

type FiltersDropdownContentProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  referenceElement: HTMLButtonElement | null;
  setReferenceElement: (el: HTMLButtonElement | null) => void;
  popperElement: HTMLDivElement | null;
  setPopperElement: (el: HTMLDivElement | null) => void;
  styles: Record<string, React.CSSProperties>;
  attributes: Record<string, Record<string, string> | undefined>;
};

function FiltersDropdownContent(props: FiltersDropdownContentProps) {
  const {
    open,
    title,
    children,
    dropdownRef,
    referenceElement,
    setReferenceElement,
    popperElement,
    setPopperElement,
    styles,
    attributes,
  } = props;

  // On React 19 the trigger button's ref callback can be dropped after
  // a disrupted render, leaving referenceElement null and the popper
  // dead. Recover by locating the trigger button from the container DOM.
  useEffect(() => {
    if (open && !referenceElement && dropdownRef.current) {
      const btn = dropdownRef.current.querySelector<HTMLButtonElement>("button");
      if (btn) setReferenceElement(btn);
    }
  }, [open, referenceElement, dropdownRef, setReferenceElement]);

  // On React 19 the panel div's ref callback can be dropped after a
  // disrupted render, leaving popperElement null forever: popper never
  // runs and the panel renders at the document's default (0,0) corner.
  // This panel is not portaled, so recover by locating it inside the
  // dropdown's own container instead of document-wide.
  useEffect(() => {
    if (popperElement) return;
    const find = () => {
      if (!dropdownRef.current) return false;
      const el = dropdownRef.current.querySelector<HTMLDivElement>(
        '[data-open] > div, [data-headlessui-state="open"] > div'
      );
      if (el) setPopperElement(el);
      return !!el;
    };
    if (open && !find()) {
      const t1 = setTimeout(find, 50);
      const t2 = setTimeout(find, 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [open, popperElement, dropdownRef, setPopperElement]);

  return (
    <>
      <Popover.Button as={React.Fragment}>
        <Button ref={setReferenceElement} variant="secondary">
          <div className={`${open ? "text-primary" : "text-secondary"}`}>
            <span>{title}</span>
          </div>
        </Button>
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel>
          <div
            className="z-10 overflow-hidden rounded-sm border border-subtle bg-surface-1 shadow-raised-200"
            ref={setPopperElement}
            style={styles.popper}
            {...attributes.popper}
          >
            <div className="flex max-h-[37.5rem] w-[18.75rem] flex-col overflow-hidden">{children}</div>
          </div>
        </Popover.Panel>
      </Transition>
    </>
  );
}
