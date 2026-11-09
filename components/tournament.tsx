"use client";

import { useMemo, useState } from "react";
import { Badge, Section } from "./ui";
import { Trophy } from "lucide-react";
import {
  advanceKnockout,
  knockoutPairings,
  roundRobinPairings,
  swissPairings,
  tournamentStandings,
  type Match,
  type Result,
} from "@/lib/tournament";

export default function Tournament({ event, data, onSave }: any) {
  const [format, setFormat] = useState("Swiss System");
  const [control, setControl] = useState("Blitz");
  const [preset, setPreset] = useState("5+0");
  const [roundCount, setRoundCount] = useState(5);
  const [boards, setBoards] = useState(4);
  const [error, setError] = useState("");
  const [viewRound, setViewRound] = useState(-1);
  const tournament = event.custom?.tournament;
  const players = useMemo(() => {
    return (data.participants || [])
      .filter((p: any) => p.eventId === event.id && p.status !== "Cancelled")
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        rating: Number(p.rating) || 0,
        school:
          (data.organizations || []).find(
            (o: any) => o.id === p.organizationId,
          )?.name || "",
      }));
  }, [event.id, data.participants, data.organizations]);

  const rounds: Match[][] = tournament?.rounds || [];
  const allMatches = rounds.flat();
  const activeRoundIndex = rounds.findIndex((round) =>
    round.some((match) => !match.result),
  );
  const shownRoundIndex = viewRound >= 0 && viewRound < rounds.length
    ? viewRound
    : activeRoundIndex >= 0 ? activeRoundIndex : Math.max(0, rounds.length - 1);
  const standings = tournamentStandings(tournament?.players || players, allMatches);
  const complete = allMatches.length > 0 && allMatches.every((match) => match.result);

  async function persist(next: any) {
    setError("");
    try {
      await onSave(
        "events",
        { ...event, custom: { ...event.custom, tournament: next } },
        true,
      );
    } catch (e: any) {
      setError(e.message);
    }
  }

  function start() {
    if (players.length < 2) {
      setError("Register at least two participants for this event first.");
      return;
    }
    const pairings =
      format === "Swiss System"
        ? [swissPairings(players, [], 1, boards)]
        : format === "Round Robin"
          ? roundRobinPairings(players, boards)
          : knockoutPairings(players, boards);
    persist({
      state: "In Progress",
      format,
      control,
      preset,
      roundCount: Number(roundCount),
      boards: Number(boards),
      players,
      rounds: pairings,
      startedAt: new Date().toISOString(),
      history: [],
    });
  }

  function recordResult(match: Match, result: Result) {
    const corrected = { ...match, result };
    let updated = rounds.map((round) =>
      round.map((current) => (current.id === match.id ? corrected : current)),
    );
    if (tournament.format === "Single Elimination") {
      const roundIndex = rounds.findIndex((round) =>
        round.some((current) => current.id === match.id),
      );
      if (roundIndex === rounds.length - 1) {
        updated = advanceKnockout(updated, corrected, Number(tournament.boards));
      }
    }
    persist({
      ...tournament,
      rounds: updated,
      history: [
        ...(tournament.history || []),
        { matchId: match.id, old: match.result, result, at: new Date().toISOString() },
      ],
    });
  }

  function nextRound() {
    const current = rounds.at(-1) || [];
    if (current.some((match) => !match.result)) {
      setError("Record every result in this round before pairing the next one.");
      return;
    }
    if (rounds.length >= Number(tournament.roundCount)) {
      persist({ ...tournament, state: "Completed" });
      return;
    }
    const next = swissPairings(
      tournament.players,
      allMatches,
      rounds.length + 1,
      Number(tournament.boards),
    );
    persist({ ...tournament, rounds: [...rounds, next] });
  }

  if (!tournament) {
    return (
      <Section
        title="START · Tournament"
        subtitle="Create pairings from the participants already registered for this event."
      >
        <div className="form-grid">
          <label>
            <span>Tournament format</span>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option>Swiss System</option>
              <option>Single Elimination</option>
              <option>Round Robin</option>
            </select>
          </label>
          <label>
            <span>Time control</span>
            <select
              value={control}
              onChange={(e) => {
                setControl(e.target.value);
                setPreset(
                  ({
                    Bullet: "1+0",
                    Blitz: "5+0",
                    Rapid: "10+0",
                    Classical: "60+0",
                    Custom: "5+0",
                  } as any)[e.target.value],
                );
              }}
            >
              {["Bullet", "Blitz", "Rapid", "Classical", "Custom"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          <label>
            <span>Base time + increment</span>
            <input value={preset} onChange={(e) => setPreset(e.target.value)} />
          </label>
          <label>
            <span>Available boards</span>
            <input
              type="number"
              min="1"
              value={boards}
              onChange={(e) => setBoards(Math.max(1, Number(e.target.value)))}
            />
          </label>
          {format === "Swiss System" && (
            <label>
              <span>Rounds</span>
              <input
                type="number"
                min="1"
                value={roundCount}
                onChange={(e) => setRoundCount(Math.max(1, Number(e.target.value)))}
              />
            </label>
          )}
        </div>
        <p className="notes-text tournament-player-count">
          {players.length} participants registered. Add or remove players in the
          Participants tab before starting.
        </p>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="button primary" onClick={start}>
          Create pairings and start
        </button>
      </Section>
    );
  }

  const playerName = (id: string | null) =>
    tournament.players.find((player: any) => player.id === id)?.name || "—";
  const seededPlayers = [...tournament.players].sort(
    (a: any, b: any) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || a.name.localeCompare(b.name),
  );
  const playerSeed = (id: string | null) => seededPlayers.findIndex((player: any) => player.id === id) + 1;

  function ResultPicker({ match, roundIndex }: { match: Match; roundIndex: number }) {
    if (match.bye) return <span className="tournament-bye">Advances</span>;
    const disabled =
      tournament.state !== "In Progress" || roundIndex > activeRoundIndex;
    return (
      <select
        className="tournament-result"
        aria-label={`Result: ${playerName(match.white)} vs ${playerName(match.black)}`}
        value={match.result || ""}
        disabled={disabled}
        onChange={(e) => recordResult(match, e.target.value as Result)}
      >
        <option value="">Record result</option>
        <option value="1-0">White wins</option>
        <option value="0-1">Black wins</option>
        <option value="½-½">Draw</option>
        <option value="0-0">Double forfeit</option>
      </select>
    );
  }

  function SwissRound({ round, roundIndex }: { round: Match[]; roundIndex: number }) {
    const roundNumber = round[0]?.round || roundIndex + 1;
    const points = (id: string | null) =>
      standings.find((player: any) => player.id === id)?.points ?? 0;
    return (
      <Section key={roundIndex} title={`Round ${roundNumber}`}>
        <div className="swiss-pairings-scroll">
          <table className="swiss-pairings">
            <thead>
              <tr>
                <th>#</th>
                <th>White pieces</th>
                <th>Pts</th>
                <th>{`Round ${roundNumber}`}</th>
                <th>Pts</th>
                <th>Black pieces</th>
              </tr>
            </thead>
            <tbody>
              {round.map((match) => (
                <tr key={match.id}>
                  <td>{match.board}</td>
                  <td>{playerName(match.white)}</td>
                  <td><span className="tournament-points">{points(match.white).toFixed(1)}</span></td>
                  <td><ResultPicker match={match} roundIndex={roundIndex} /></td>
                  <td><span className="tournament-points">{points(match.black).toFixed(1)}</span></td>
                  <td>{match.bye ? <span className="tournament-bye">BYE</span> : playerName(match.black)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    );
  }

  function KnockoutBracket() {
    const firstRoundCount = rounds[0]?.length || 1;
    return (
      <Section title="Elimination bracket" subtitle="Click a player name to record the win and advance them.">
        <div className="knockout-bracket-scroll">
          <div className="knockout-bracket-heading">
            <strong>{event.name}</strong>
            <small>{tournament.startedAt ? new Date(tournament.startedAt).toLocaleDateString() : "Tournament bracket"}</small>
          </div>
          <div className="knockout-bracket" style={{ "--bracket-rows": firstRoundCount * 4 } as any}>
            {rounds.map((round, roundIndex) => (
              <div className="knockout-round" key={`round-${roundIndex}`}>
                <h4>{roundIndex === rounds.length - 1 && round.length === 1 ? "Final" : roundIndex === 0 && round.some((match) => match.bye) ? "Play-in" : `Round ${roundIndex + 1}`}</h4>
                {round.map((match, matchIndex) => {
                  const startRow = matchIndex * 4 * 2 ** roundIndex + 2 ** (roundIndex + 1);
                  const connectorStyle = {
                    gridRow: `${startRow} / span 2`,
                    "--line-offset": `${34 * (2 ** roundIndex - 1)}px`,
                    "--line-height": `${34 * 2 ** (roundIndex + 1)}px`,
                  } as any;
                  return (
                    match.bye ? (
                      <div className={`knockout-advance ${roundIndex > 0 ? "has-connector" : ""}`} key={match.id} style={connectorStyle}>
                        {roundIndex > 0 && <i className="knockout-connector" />}
                        <strong>{playerName(match.white)}</strong><span>Direct advance</span>
                      </div>
                    ) : (
                      <div className={`knockout-match ${roundIndex > 0 ? "has-connector" : ""}`} key={match.id} style={connectorStyle}>
                        {roundIndex > 0 && <i className="knockout-connector" />}
                        <button className={`knockout-player ${match.result === "1-0" ? "winner" : ""}`} disabled={tournament.state !== "In Progress" || roundIndex > activeRoundIndex} onClick={() => recordResult(match, "1-0")}>
                          <span><small>{playerSeed(match.white)}.</small>{playerName(match.white)}</span>{match.result === "1-0" && <b>W</b>}
                        </button>
                        <button className={`knockout-player ${match.result === "0-1" ? "winner" : ""}`} disabled={tournament.state !== "In Progress" || roundIndex > activeRoundIndex} onClick={() => recordResult(match, "0-1")}>
                          <span><small>{playerSeed(match.black)}.</small>{playerName(match.black)}</span>{match.result === "0-1" && <b>W</b>}
                        </button>
                      </div>
                    )
                  );
                })}
              </div>
            ))}
            <div className="knockout-champion">
              <Trophy size={34} strokeWidth={1.7} />
              {tournament.state === "Completed" && standings[0] ? <strong>{standings[0].name}</strong> : null}
              <small>Winner</small>
            </div>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <div className="detail-related tournament-workspace">
      <Section
        title={event.name}
        subtitle={`${tournament.format} · ${tournament.control} ${tournament.preset} · ${tournament.players.length} players`}
      >
        <div className="row-between">
          <div className="row">
            <Badge>{tournament.state}</Badge>
            <span>
              Round {rounds.length}
              {tournament.format === "Swiss System" ? ` of ${tournament.roundCount}` : ""}
            </span>
          </div>
          <span>{allMatches.filter((match) => match.result).length}/{allMatches.length} matches completed</span>
        </div>
        {tournament.format !== "Single Elimination" && rounds.length > 0 && (
          <label className="tournament-round-picker">
            <span>Round</span>
            <select value={shownRoundIndex} onChange={(e) => setViewRound(Number(e.target.value))}>
              {rounds.map((round, index) => <option key={index} value={index}>{round[0]?.round || index + 1}</option>)}
            </select>
          </label>
        )}
        {tournament.state === "Paused" && (
          <button className="button" onClick={() => persist({ ...tournament, state: "In Progress" })}>Resume</button>
        )}
        {tournament.state === "In Progress" && (
          <button className="button" onClick={() => persist({ ...tournament, state: "Paused" })}>Pause</button>
        )}
        {tournament.format === "Swiss System" && tournament.state === "In Progress" && complete && rounds.length < Number(tournament.roundCount) && (
          <button className="button primary" onClick={nextRound}>Generate round {rounds.length + 1}</button>
        )}
        {tournament.format === "Swiss System" && tournament.state === "In Progress" && complete && rounds.length >= Number(tournament.roundCount) && (
          <button className="button primary" onClick={() => persist({ ...tournament, state: "Completed" })}>Complete tournament</button>
        )}
      </Section>

      {tournament.format === "Single Elimination" ? (
        KnockoutBracket()
      ) : rounds[shownRoundIndex] ? (
        SwissRound({ round: rounds[shownRoundIndex], roundIndex: shownRoundIndex })
      ) : null}

      {complete && tournament.state === "In Progress" && tournament.format !== "Swiss System" && (
        <button className="button primary" onClick={() => persist({ ...tournament, state: "Completed" })}>Complete tournament</button>
      )}
      <Section title="Standings">
        <div className="linked-list">
          {standings.map((player: any, index: number) => (
            <article className="participant-row" key={player.id}>
              <strong>#{index + 1} {player.name}</strong>
              <span>{player.points} pts · {player.wins}W {player.draws}D {player.losses}L · {player.games} games</span>
            </article>
          ))}
        </div>
      </Section>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
