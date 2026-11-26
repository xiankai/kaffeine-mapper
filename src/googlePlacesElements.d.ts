import "react";

type ElementProps = import("react").DetailedHTMLProps<
  import("react").HTMLAttributes<HTMLElement>,
  HTMLElement
>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "gmp-place-details-compact": ElementProps & {
        orientation?: "horizontal" | "vertical";
      };
      "gmp-place-details-place-request": ElementProps & { place: string };
      "gmp-place-all-content": ElementProps;
    }
  }
}
