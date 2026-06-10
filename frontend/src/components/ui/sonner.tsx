import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Themed toast surface matching the Midnight Infrastructure palette. */
function Toaster(props: ToasterProps): React.ReactElement {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group border border-border bg-surface text-foreground shadow-xl",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
