/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { CSSProperties, RefObject } from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { Link } from "react-router";
import { usePathname, useSearchParams } from "next/navigation";
import { usePopper } from "react-popper";
import { LogOutOutline } from "@makeplane/propel/icons";
import { Popover, Transition } from "@headlessui/react";
// plane imports
import { API_BASE_URL } from "@plane/constants";
import { Button } from "@plane/propel/button";
import { AuthService } from "@plane/services";
import { Avatar } from "@plane/ui";
import { getFileURL } from "@plane/utils";
// helpers
import { queryParamGenerator } from "@/helpers/query-param-generator";
// hooks
import { useUser } from "@/hooks/store/use-user";

const authService = new AuthService();

export const UserAvatar = observer(function UserAvatar() {
  const pathName = usePathname();
  const searchParams = useSearchParams();
  // query params
  const board = searchParams.get("board") || undefined;
  const labels = searchParams.get("labels") || undefined;
  const state = searchParams.get("state") || undefined;
  const priority = searchParams.get("priority") || undefined;
  const peekId = searchParams.get("peekId") || undefined;
  // hooks
  const { data: currentUser, signOut } = useUser();
  // states
  const [csrfToken, setCsrfToken] = useState<string | undefined>(undefined);
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  // refs
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (csrfToken === undefined)
      authService.requestCSRFToken().then((data) => data?.csrf_token && setCsrfToken(data.csrf_token));
  }, [csrfToken]);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: "bottom-end",
    modifiers: [
      {
        name: "offset",
        options: {
          offset: [0, 40],
        },
      },
    ],
  });

  // derived values
  const { queryParam } = queryParamGenerator({ peekId, board, state, priority, labels });

  return (
    <div className="relative mr-2">
      {currentUser?.id ? (
        <div>
          <Popover as="div" ref={dropdownRef}>
            {({ open }) => (
              <UserAvatarPopoverContent
                open={open}
                dropdownRef={dropdownRef}
                referenceElement={referenceElement}
                setReferenceElement={setReferenceElement}
                popperElement={popperElement}
                setPopperElement={setPopperElement}
                styles={styles}
                attributes={attributes}
                currentUser={currentUser}
                csrfToken={csrfToken}
                pathName={pathName}
                queryParam={queryParam}
                signOut={signOut}
              />
            )}
          </Popover>
        </div>
      ) : (
        <div className="flex-shrink-0">
          <Link to={`/?next_path=${pathName}?${queryParam}`}>
            <Button variant="secondary">Sign in</Button>
          </Link>
        </div>
      )}
    </div>
  );
});

type UserAvatarPopoverContentProps = {
  open: boolean;
  dropdownRef: RefObject<HTMLDivElement | null>;
  referenceElement: HTMLButtonElement | null;
  setReferenceElement: (el: HTMLButtonElement | null) => void;
  popperElement: HTMLDivElement | null;
  setPopperElement: (el: HTMLDivElement | null) => void;
  styles: Record<string, CSSProperties>;
  attributes: Record<string, Record<string, string> | undefined>;
  currentUser: ReturnType<typeof useUser>["data"];
  csrfToken: string | undefined;
  pathName: string;
  queryParam: string;
  signOut: () => void;
};

function UserAvatarPopoverContent(props: UserAvatarPopoverContentProps) {
  const {
    open,
    dropdownRef,
    referenceElement,
    setReferenceElement,
    popperElement,
    setPopperElement,
    styles,
    attributes,
    currentUser,
    csrfToken,
    pathName,
    queryParam,
    signOut,
  } = props;

  // On React 19 the trigger button's ref callback can be dropped after a
  // disrupted render, leaving referenceElement null and the popper dead.
  // Recover by locating the trigger button from the container DOM.
  useEffect(() => {
    if (open && !referenceElement && dropdownRef.current) {
      const btn = dropdownRef.current.querySelector<HTMLButtonElement>("button");
      if (btn) setReferenceElement(btn);
    }
  }, [open, referenceElement, dropdownRef, setReferenceElement]);

  // On React 19 the panel div's ref callback can be dropped after a
  // disrupted render, leaving popperElement null forever: popper never runs
  // and the panel renders at the document's default (0,0) corner. This panel
  // is not portaled, so recover by locating it inside the dropdown's own
  // container instead of document-wide.
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
      <Popover.Button as={Fragment}>
        <button ref={setReferenceElement} className="flex items-center gap-2 rounded-sm border border-subtle p-2">
          <Avatar
            name={currentUser?.display_name}
            src={getFileURL(currentUser?.avatar_url ?? "")}
            shape="square"
            size="sm"
            showTooltip={false}
          />
          <h6 className="text-11 font-medium text-secondary">
            {currentUser?.display_name ||
              `${currentUser?.first_name} ${currentUser?.last_name}` ||
              currentUser?.email ||
              "User"}
          </h6>
        </button>
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
            className="z-10 overflow-hidden rounded-sm border border-subtle bg-surface-1 p-1 shadow-raised-200"
            ref={setPopperElement}
            style={styles.popper}
            {...attributes.popper}
            onClickCapture={(e) => {
              // React 19 hit-testing sometimes resolves the sign-out button
              // click to this panel container instead of the button itself.
              // There is no indexed option list here (just one action), so
              // re-dispatch the click onto the real element under the pointer.
              const root = e.currentTarget as HTMLElement;
              if (e.target === root) {
                const real = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
                if (real && real !== root) {
                  e.preventDefault();
                  e.stopPropagation();
                  real.dispatchEvent(
                    new MouseEvent("click", { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY })
                  );
                }
              }
            }}
          >
            {csrfToken && (
              <form method="POST" action={`${API_BASE_URL}/auth/spaces/sign-out/`} onSubmit={signOut}>
                <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken} />
                <input type="hidden" name="next_path" value={`${pathName}?${queryParam}`} />
                <button
                  type="submit"
                  className="flex min-w-36 cursor-pointer items-center gap-2 rounded-sm p-2 text-13 whitespace-nowrap hover:bg-layer-transparent-hover"
                >
                  <LogOutOutline width={12} height={12} className="shrink-0 text-danger-primary" />
                  <div>Sign out</div>
                </button>
              </form>
            )}
          </div>
        </Popover.Panel>
      </Transition>
    </>
  );
}
