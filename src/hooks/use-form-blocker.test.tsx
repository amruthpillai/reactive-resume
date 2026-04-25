import type { FieldValues, UseFormReturn } from "react-hook-form";

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { useFormBlocker } from "./use-form-blocker";

type ConfirmOptions = {
  description?: string;
  confirmText?: string;
  cancelText?: string;
};

type ConfirmFn = (title: string, options?: ConfirmOptions) => Promise<boolean>;

const { closeDialogMock, confirmMock } = vi.hoisted(() => ({
  closeDialogMock: vi.fn<() => void>(),
  confirmMock: vi.fn<ConfirmFn>(),
}));

vi.mock("@lingui/core/macro", () => ({
  t: (strings: TemplateStringsArray) => strings[0],
}));

vi.mock("@/dialogs/store", () => ({
  useDialogStore: (selector: (state: { closeDialog: () => void }) => unknown) =>
    selector({ closeDialog: closeDialogMock }),
}));

vi.mock("@/hooks/use-confirm", () => ({
  useConfirm: () => confirmMock,
}));

afterEach(cleanup);

function createFormState({
  isDirty = false,
  isSubmitting = false,
}: {
  isDirty?: boolean;
  isSubmitting?: boolean;
}): UseFormReturn<FieldValues> {
  return {
    formState: { isDirty, isSubmitting },
  } as UseFormReturn<FieldValues>;
}

describe("useFormBlocker", () => {
  beforeEach(() => {
    closeDialogMock.mockReset();
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(false);
  });

  describe("default shouldBlock behavior", () => {
    it("does not block when form is not dirty", async () => {
      const { result } = renderHook(() => useFormBlocker(createFormState({ isDirty: false, isSubmitting: false })));

      await act(async () => {
        await result.current.requestClose();
      });

      expect(closeDialogMock).toHaveBeenCalledTimes(1);
      expect(confirmMock).not.toHaveBeenCalled();
    });

    it("does not block while submitting even if dirty", async () => {
      const { result } = renderHook(() => useFormBlocker(createFormState({ isDirty: true, isSubmitting: true })));

      await act(async () => {
        await result.current.requestClose();
      });

      expect(closeDialogMock).toHaveBeenCalledTimes(1);
      expect(confirmMock).not.toHaveBeenCalled();
    });

    it("blocks when form is dirty and not submitting", async () => {
      const { result } = renderHook(() => useFormBlocker(createFormState({ isDirty: true, isSubmitting: false })));

      await act(async () => {
        await result.current.requestClose();
      });

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(closeDialogMock).not.toHaveBeenCalled();
    });
  });

  describe("custom shouldBlock override", () => {
    it("uses custom shouldBlock instead of default form-state logic", async () => {
      const shouldBlock = vi.fn<() => boolean>(() => true);
      const { result } = renderHook(() =>
        useFormBlocker(createFormState({ isDirty: false, isSubmitting: false }), { shouldBlock }),
      );

      await act(async () => {
        await result.current.requestClose();
      });

      expect(shouldBlock).toHaveBeenCalledTimes(1);
      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(closeDialogMock).not.toHaveBeenCalled();
    });
  });

  describe("requestClose", () => {
    it("closes immediately when not blocked", async () => {
      const { result } = renderHook(() => useFormBlocker(createFormState({ isDirty: false, isSubmitting: false })));

      await act(async () => {
        await result.current.requestClose();
      });

      expect(closeDialogMock).toHaveBeenCalledTimes(1);
      expect(confirmMock).not.toHaveBeenCalled();
    });

    it("keeps dialog open when blocked and confirmation is declined", async () => {
      confirmMock.mockResolvedValue(false);
      const { result } = renderHook(() => useFormBlocker(createFormState({ isDirty: true, isSubmitting: false })));

      await act(async () => {
        await result.current.requestClose();
      });

      expect(confirmMock).toHaveBeenCalledWith("Are you sure you want to close this dialog?", {
        description: "You have unsaved changes that will be lost.",
        confirmText: "Leave",
        cancelText: "Stay",
      });
      expect(closeDialogMock).not.toHaveBeenCalled();
    });

    it("closes dialog when blocked and confirmation is accepted", async () => {
      confirmMock.mockResolvedValue(true);
      const { result } = renderHook(() => useFormBlocker(createFormState({ isDirty: true, isSubmitting: false })));

      await act(async () => {
        await result.current.requestClose();
      });

      expect(confirmMock).toHaveBeenCalledTimes(1);
      expect(closeDialogMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("blockEvents", () => {
    it.each(["onEscapeKeyDown", "onPointerDownOutside", "onInteractOutside"] as const)(
      "does not prevent default for %s when not blocking",
      async (handlerName) => {
        const { result } = renderHook(() => useFormBlocker(createFormState({ isDirty: false, isSubmitting: false })));
        const preventDefault = vi.fn<() => void>();

        await act(async () => {
          result.current.blockEvents[handlerName]({ preventDefault } as unknown as Event & KeyboardEvent);
        });

        expect(preventDefault).not.toHaveBeenCalled();
        expect(confirmMock).not.toHaveBeenCalled();
        expect(closeDialogMock).not.toHaveBeenCalled();
      },
    );

    it.each(["onEscapeKeyDown", "onPointerDownOutside", "onInteractOutside"] as const)(
      "prevents default for %s and requests close when blocking",
      async (handlerName) => {
        const { result } = renderHook(() => useFormBlocker(createFormState({ isDirty: true, isSubmitting: false })));
        const preventDefault = vi.fn<() => void>();

        await act(async () => {
          result.current.blockEvents[handlerName]({ preventDefault } as unknown as Event & KeyboardEvent);
        });

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(confirmMock).toHaveBeenCalledTimes(1);
        expect(closeDialogMock).not.toHaveBeenCalled();
      },
    );
  });
});
