"use client"
import * as Dialog from '@radix-ui/react-dialog'
import { ReactNode } from 'react'
import { Button } from './button'

export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onOpenChange
}: {
  open: boolean
  title?: string
  description?: ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background p-4 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
          {description ? <div className="mt-2 text-sm text-muted-foreground">{description}</div> : null}
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" onClick={() => onOpenChange(false)}>{cancelText}</Button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Button variant="destructive" onClick={() => onConfirm()}>{confirmText}</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
