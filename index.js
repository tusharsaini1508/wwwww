import '@expo/metro-runtime';
import React from 'react';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import Head from 'expo-router/head';
import { ctx } from 'expo-router/_ctx';
import 'expo-router/build/fast-refresh';

function App() {
  return (
    <Head.Provider>
      <ExpoRoot context={ctx} />
    </Head.Provider>
  );
}

registerRootComponent(App);