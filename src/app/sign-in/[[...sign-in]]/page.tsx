import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function Page() {
  return (
    <div className="w-full h-screen grid place-items-center">
      <SignIn
        appearance={{
          theme: dark,
        }}
      />
    </div>
  );
}
