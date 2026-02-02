import { createContext, useContext } from "react";
import { useNavigate, type NavigateOptions } from "react-router-dom";

export const BasePathContext = createContext<string>("");
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer() {
  return useContext(PortalContainerContext);
}

export function useNav() {
  const basePath = useContext(BasePathContext);
  const rawNavigate = useNavigate();

  const to = (path: string) => (basePath ? `${basePath}${path}` : path);

  const navigate = (
    pathOrDelta: string | number,
    options?: NavigateOptions,
  ) => {
    if (typeof pathOrDelta === "number") {
      rawNavigate(pathOrDelta);
    } else {
      rawNavigate(to(pathOrDelta), options);
    }
  };

  return { to, navigate };
}
