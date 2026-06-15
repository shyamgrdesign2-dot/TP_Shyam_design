import React from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store";
import SentryContextSync from "../components/SentryContextSync";

const AppStoreProvider = ({ children }) => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SentryContextSync />
        {children}
      </PersistGate>
    </Provider>
  );
};

export default AppStoreProvider;
