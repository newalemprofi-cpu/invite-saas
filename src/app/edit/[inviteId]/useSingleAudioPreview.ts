"use client";

import { useEffect, useState } from "react";

/**
 * One shared <audio> element for the whole constructor (recommended-track
 * preview buttons in the Media tab + the phone preview's own mini player),
 * so selecting/previewing a different track always stops whatever was
 * playing before instead of layering multiple simultaneous audio streams.
 * Module-level by design — there is only ever one constructor mounted per
 * page, and this needs to survive independently of any single component's
 * lifecycle.
 */
let sharedAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.addEventListener("ended", () => {
      currentUrl = null;
      notify();
    });
  }
  return sharedAudio;
}

export function useSingleAudioPreview() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const cb = () => forceRender((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  return {
    playingUrl: currentUrl,
    /** Toggles playback of `url` — stops it if already playing, otherwise stops anything else and starts this one. */
    toggle(url: string) {
      const audio = getSharedAudio();
      if (currentUrl === url) {
        audio.pause();
        currentUrl = null;
        notify();
        return;
      }
      audio.pause();
      audio.src = url;
      audio.loop = false;
      audio
        .play()
        .then(() => {
          currentUrl = url;
          notify();
        })
        .catch(() => {
          currentUrl = null;
          notify();
        });
    },
    stop() {
      if (sharedAudio) sharedAudio.pause();
      currentUrl = null;
      notify();
    },
  };
}
