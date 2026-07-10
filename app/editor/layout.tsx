import "./editor-frame.css";

/**
 * Scopes the transparent-document styles to the customer editor routes only.
 * Next loads this CSS solely on /editor/*, so the admin pages keep their own
 * background.
 */
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
