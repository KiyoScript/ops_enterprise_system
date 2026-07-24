"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadSignatureAction } from "@/app/(app)/settings/actions";

/** Uploads the proprietor's signature — the single asset every printable
 *  (JO / DR / Quotation) prints in its "Reviewed and Approved by" block. */
export function SignatureUpload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [bust, setBust] = useState(() => Date.now()); // cache-buster for the current image
  const [pending, startTransition] = useTransition();

  // Revoke object URLs so previews don't leak.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : null;
    });
  };

  const upload = () => {
    const f = fileRef.current?.files?.[0];
    if (!f) {
      toast.error("Choose a signature image first.");
      return;
    }
    const fd = new FormData();
    fd.append("file", f);
    startTransition(async () => {
      const result = await uploadSignatureAction(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Signature updated — it now prints on new documents.");
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      setBust(Date.now());
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Owner Signature</CardTitle>
        <CardDescription>
          The proprietor&apos;s signature stamped in the &ldquo;Reviewed and
          Approved by&rdquo; block of the Job Order, Delivery Receipt, and
          Quotation printables. PNG or JPEG, ideally on a transparent or white
          background. Max 2&nbsp;MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-6">
          <div className="grid gap-1">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Current
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/jon-signature.png?v=${bust}`}
              alt="Current signature"
              className="h-20 w-auto rounded border bg-white object-contain p-2"
            />
          </div>
          {preview && (
            <div className="grid gap-1">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                New (preview)
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="New signature preview"
                className="h-20 w-auto rounded border bg-white object-contain p-2"
              />
            </div>
          )}
        </div>
        <Input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={onFile}
          className="max-w-sm"
        />
        <Button onClick={upload} disabled={pending} className="w-fit">
          {pending ? "Uploading…" : "Upload signature"}
        </Button>
      </CardContent>
    </Card>
  );
}
