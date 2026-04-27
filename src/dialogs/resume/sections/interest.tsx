import type z from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { useForm, useFormContext, useFormState } from "react-hook-form";

import type { DialogProps } from "@/dialogs/store";

import { ChipInput } from "@/components/input/chip-input";
import { ColorPicker } from "@/components/input/color-picker";
import { IconPicker } from "@/components/input/icon-picker";
import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PopoverTrigger } from "@/components/ui/popover";
import { useDialogStore } from "@/dialogs/store";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { interestItemSchema } from "@/schema/resume/data";
import { createSectionItem, updateSectionItem } from "@/utils/resume/section-actions";
import { generateId } from "@/utils/string";
import { cn } from "@/utils/style";

const formSchema = interestItemSchema;

type FormValues = z.infer<typeof formSchema>;

export function CreateInterestDialog({ data }: DialogProps<"resume.sections.interests.create">) {
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const updateResumeData = useResumeStore((state) => state.updateResumeData);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: generateId(),
      hidden: data?.item?.hidden ?? false,
      icon: data?.item?.icon ?? "acorn",
      iconColor: data?.item?.iconColor ?? "",
      name: data?.item?.name ?? "",
      keywords: data?.item?.keywords ?? [],
    },
  });

  const onSubmit = (formData: FormValues) => {
    updateResumeData((draft) => {
      createSectionItem(draft, "interests", formData, data?.customSectionId);
    });
    closeDialog();
  };

  const { blockEvents, requestClose } = useFormBlocker(form);

  return (
    <DialogContent {...blockEvents}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-x-2">
          <PlusIcon />
          <Trans>Create a new interest</Trans>
        </DialogTitle>
        <DialogDescription />
      </DialogHeader>

      <Form {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <InterestForm />

          <DialogFooter className="sm:col-span-full">
            <Button variant="ghost" onClick={requestClose}>
              <Trans>Cancel</Trans>
            </Button>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Trans>Create</Trans>
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

export function UpdateInterestDialog({ data }: DialogProps<"resume.sections.interests.update">) {
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const updateResumeData = useResumeStore((state) => state.updateResumeData);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: data.item.id,
      hidden: data.item.hidden,
      icon: data.item.icon,
      iconColor: data.item.iconColor,
      name: data.item.name,
      keywords: data.item.keywords,
    },
  });

  const onSubmit = (formData: FormValues) => {
    updateResumeData((draft) => {
      updateSectionItem(draft, "interests", formData, data?.customSectionId);
    });
    closeDialog();
  };

  const { blockEvents, requestClose } = useFormBlocker(form);

  return (
    <DialogContent {...blockEvents}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-x-2">
          <PencilSimpleLineIcon />
          <Trans>Update an existing interest</Trans>
        </DialogTitle>
        <DialogDescription />
      </DialogHeader>

      <Form {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <InterestForm />

          <DialogFooter className="sm:col-span-full">
            <Button variant="ghost" onClick={requestClose}>
              <Trans>Cancel</Trans>
            </Button>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              <Trans>Save Changes</Trans>
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

function InterestForm() {
  const form = useFormContext<FormValues>();
  const nameState = useFormState({ control: form.control, name: "name" });

  const isNameInvalid = useMemo(() => {
    return nameState.errors && Object.keys(nameState.errors).length > 0;
  }, [nameState]);

  return (
    <>
      <div className={cn("col-span-full flex items-end", isNameInvalid && "items-center")}>
        <FormField
          control={form.control}
          name={"icon"}
          render={({ field }) => (
            <FormItem className="shrink-0">
              <FormControl
                render={
                  <IconPicker
                    {...field}
                    popoverProps={{ modal: true }}
                    className="rounded-r-none border-e-0 border-input"
                  />
                }
              />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>
                <Trans>Name</Trans>
              </FormLabel>
              <FormControl render={<Input className="rounded-s-none rounded-e-none" {...field} />} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="iconColor"
          render={({ field }) => (
            <FormItem className="shrink-0">
              <FormControl
                render={
                  <ColorPicker
                    {...field}
                    value={field.value}
                    onChange={field.onChange}
                    trigger={
                      <PopoverTrigger className="h-9 rounded-e border-y border-e border-input px-2">
                        <div
                          className="size-4 shrink-0 cursor-pointer rounded-full border border-foreground/60 transition-all hover:scale-105 focus-visible:outline-hidden"
                          style={{ backgroundColor: field.value ?? "currentColor" }}
                        />
                      </PopoverTrigger>
                    }
                  />
                }
              />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="keywords"
        render={({ field }) => (
          <FormItem className="col-span-full">
            <FormLabel>
              <Trans>Keywords</Trans>
            </FormLabel>
            <FormControl render={<ChipInput {...field} />} />
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
