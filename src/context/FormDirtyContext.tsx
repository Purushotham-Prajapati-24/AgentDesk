"use client";

import React, { createContext, useContext, useState } from "react";

type FormDirtyContextType = {
  isFormDirty: boolean;
  setIsFormDirty: (dirty: boolean) => void;
};

const FormDirtyContext = createContext<FormDirtyContextType | undefined>(undefined);

export function FormDirtyProvider({ children }: { children: React.ReactNode }) {
  const [isFormDirty, setIsFormDirty] = useState(false);

  return (
    <FormDirtyContext.Provider value={{ isFormDirty, setIsFormDirty }}>
      {children}
    </FormDirtyContext.Provider>
  );
}

export function useFormDirty() {
  const context = useContext(FormDirtyContext);
  if (context === undefined) {
    throw new Error("useFormDirty must be used within a FormDirtyProvider");
  }
  return context;
}
