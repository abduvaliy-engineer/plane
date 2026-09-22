/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Popover as HeadlessReactPopover, Transition } from "@headlessui/react";
import { MoreVerticalOutline } from "@makeplane/propel/icons";
import type { Ref } from "react";
import React, { Fragment, useState } from "react";
import { usePopper } from "react-popper";
// helpers
import { cn } from "../utils";
// types
import type { TPopover } from "./types";

export function Popover(props: TPopover) {
  const {
    popperPosition = "bottom-end",
    popperPadding = 0,
    buttonClassName = "",
    popoverClassName = "",
    button,
    disabled = false,
    panelClassName = "",
    children,
    popoverButtonRef,
    buttonRefClassName = "",
  } = props;
  // states
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null);
  // Headless UI v2 types Panel's ref as Ref<HTMLElement> rather than the concrete tag.
  const [popperElement, setPopperElement] = useState<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // refs
  const popoverRootRef = React.useRef<HTMLDivElement | null>(null);

  // react-popper derived values
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: popperPosition,
    modifiers: [
      {
        name: "preventOverflow",
        options: {
          padding: popperPadding,
        },
      },
    ],
  });

  // On React 19 the reference div's ref callback can be dropped after a
  // disrupted render, leaving referenceElement null and the popper dead.
  // Recover by re-reading it from this component's own root container.
  React.useEffect(() => {
    if (isOpen && !referenceElement && popoverRootRef.current) {
      const el = popoverRootRef.current.querySelector<HTMLDivElement>(":scope > div");
      if (el) setReferenceElement(el);
    }
  }, [isOpen, referenceElement]);

  // On React 19 the panel's ref callback can be dropped after a disrupted
  // render, leaving popperElement null forever: popper never runs and the
  // panel renders at the document's default (0,0) corner instead of
  // anchored to the trigger button. Recover by locating the mounted panel
  // from this component's own root container (Popover.Panel is not
  // portaled here, so it stays inside popoverRootRef).
  React.useEffect(() => {
    if (isOpen && !popperElement && popoverRootRef.current) {
      const el = popoverRootRef.current.querySelector<HTMLElement>(
        '[data-headlessui-state~="open"], [data-open]'
      );
      if (el) setPopperElement(el);
    }
  }, [isOpen, popperElement]);

  return (
    <HeadlessReactPopover
      ref={popoverRootRef}
      className={cn("relative flex h-full w-full items-center justify-center", popoverClassName)}
    >
      {({ open }) => {
        // Sync headlessui's render-prop `open` into state so the recovery
        // effects above (which run outside this render prop) can react to it.
        if (open !== isOpen) setTimeout(() => setIsOpen(open), 0);
        return (
          <>
            <div ref={setReferenceElement} className={cn("w-full", buttonRefClassName)}>
              <HeadlessReactPopover.Button
                ref={popoverButtonRef as Ref<HTMLButtonElement>}
                className={cn(
                  {
                    "flex h-6 w-6 items-center justify-center rounded-sm bg-surface-2 text-14 transition-all hover:bg-layer-1":
                      !button,
                  },
                  buttonClassName
                )}
                disabled={disabled}
              >
                {button ? button : <MoreVerticalOutline className="h-3 w-3" />}
              </HeadlessReactPopover.Button>
            </div>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <HeadlessReactPopover.Panel
                ref={setPopperElement}
                style={styles.popper}
                {...attributes.popper}
                className={cn("absolute top-full left-0 z-20 mt-2 w-screen max-w-xs", panelClassName)}
              >
                {children}
              </HeadlessReactPopover.Panel>
            </Transition>
          </>
        );
      }}
    </HeadlessReactPopover>
  );
}
