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
        "truncation-preferred"?: string;
      };
      "gmp-place-details-place-request": ElementProps & { place: string };
      "gmp-place-content-config": ElementProps;
      "gmp-place-media": ElementProps & { "lightbox-preferred"?: string };
      "gmp-place-rating": ElementProps;
      "gmp-place-type": ElementProps;
      "gmp-place-open-now-status": ElementProps;
      "gmp-place-attribution": ElementProps;
    }
  }
}
