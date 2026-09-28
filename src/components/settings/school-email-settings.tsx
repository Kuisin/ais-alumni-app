"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  sendMySchoolEmailCodeAction,
  verifyMySchoolEmailCodeAction,
} from "@/app/actions/school-email";
import { SchoolEmail } from "@/components/verify/school-email";

/** Add or change the teacher's @aisnagoya.net address (confirmed by code). */
export function SchoolEmailSettings({ current }: { current: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  return (
    <SchoolEmail
      value={value}
      onChange={setValue}
      verifiedEmail={current}
      optional={false}
      send={sendMySchoolEmailCodeAction}
      verify={verifyMySchoolEmailCodeAction}
      onVerified={() => {
        setValue("");
        router.refresh();
      }}
    />
  );
}
