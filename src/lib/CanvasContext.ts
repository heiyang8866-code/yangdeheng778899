import React from "react";
import { Asset } from "../types";

export const CanvasContext = React.createContext<{ assets: Asset[] }>({ assets: [] });
