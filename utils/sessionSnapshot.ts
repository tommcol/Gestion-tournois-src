export interface SessionStateLike {
    currentSession?: number;
}

export interface SessionSnapshot<T> {
    state: T;
    sessionNumber: number;
}

/** Returns the state of the session that just ended, only when the session advances. */
export const getPreviousSessionSnapshot = <T extends SessionStateLike>(
    previousState: T | null | undefined,
    newState: T | null | undefined
): SessionSnapshot<T> | null => {
    const previousSession = previousState?.currentSession;
    const nextSession = newState?.currentSession;

    if (
        !previousState ||
        previousSession === undefined ||
        nextSession === undefined ||
        nextSession <= previousSession
    ) {
        return null;
    }

    return { state: previousState, sessionNumber: previousSession };
};
