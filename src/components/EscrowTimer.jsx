import React, { useEffect, useState } from "react";

export default function EscrowTimer({ remainingSeconds }) {
  const initialSeconds = Math.max(0, Number(remainingSeconds) || 0);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(Math.max(0, Number(remainingSeconds) || 0));
  }, [remainingSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (secondsLeft === 0) {
    return <div className="escrow-timer">Escrow auto-release ready</div>;
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hrs}h ${mins}m ${secs}s`;
  };

  return <div className="escrow-timer">Release in {formatTime(secondsLeft)}</div>;
}
