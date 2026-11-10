"use client";

import { useMemo, useState } from "react";
import { Badge, Section } from "./ui";
import { Trophy, ArrowLeft, ArrowRight, Check, Crown, Swords, Users, Shuffle, CircleDot, Sparkles } from "lucide-react";
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
  const [setupStep, setSetupStep] = useState(0);
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [previewPairings, setPreviewPairings] = useState<Match[][]>([]);
  const tournament = event.custom?.tournament;
  const eventPlayers = useMemo(() => {
    return (data.participants || [])
      .filter((p: any) => (selectedOrganization ? (p.organizationId === selectedOrganization || p.eventId === event.id) : p.eventId === event.id) && p.status !== "Cancelled")
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        rating: Number(p.rating) || 0,
        school:
          (data.organizations || []).find(
            (o: any) => o.id === p.organizationId,
          )?.name || "",
      }));
  }, [event.id, selectedOrganization, data.participants, data.organizations]);
  const players = selectedPlayerIds.length
    ? eventPlayers.filter((p: any) => selectedPlayerIds.includes(p.id))
    : eventPlayers;

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

  function previewDraw() {
    if (players.length < 2) {
      setError("Select at least two active participants to create a draw.");
      return;
    }
    const pairings =
      format === "Swiss System"
        ? [swissPairings(players, [], 1, boards)]
        : format === "Round Robin"
          ? roundRobinPairings(players, boards)
          : knockoutPairings(players, boards);
    setPreviewPairings(pairings);
    setSetupStep(3);
  }

  function start() {
    if (!previewPairings.length) {
      setError("Preview the draw before starting the tournament.");
      return;
    }
    persist({
      state: "In Progress",
      format,
      control,
      preset,
      roundCount: Number(roundCount),
      boards: Number(boards),
      players,
      rounds: previewPairings,
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
      <div className="tournament-setup">
        <header className="tournament-setup-header"><div><span className="tournament-eyebrow"><Sparkles size={13} /> MATCHDAY STUDIO</span><h2>Build your tournament</h2><p>A calmer, clearer way to get every player to the board.</p></div><span className="tournament-setup-event"><Trophy size={15} /> {event.name}</span></header>
        <div className="tournament-steps" aria-label="Tournament setup progress">{["Organization", "Format", "Players", "Pairings"].map((label, index) => <div className={index === setupStep ? "current" : index < setupStep ? "done" : ""} key={label}><span>{index < setupStep ? <Check size={13} /> : index + 1}</span>{label}</div>)}</div>
        {setupStep === 0 && <section className="tournament-setup-page"><span className="tournament-step-kicker">STEP 1 · YOUR CLUB</span><h3>Who’s hosting this tournament?</h3><p>Choose an organization and we’ll bring in its registered participants automatically.</p><div className="organization-choice-grid">{(data.organizations || []).map((org: any) => { const count = (data.participants || []).filter((p: any) => p.organizationId === org.id && p.status !== "Cancelled").length; return <button key={org.id} className={`organization-choice ${selectedOrganization === org.id ? "selected" : ""}`} onClick={() => setSelectedOrganization(org.id)}><span className="organization-choice-icon"><Users size={20} /></span><strong>{org.name}</strong><small>{count} registered {count === 1 ? "player" : "players"}</small>{selectedOrganization === org.id && <Check className="organization-check" size={17} />}</button>; })}</div><button className="button tournament-next" disabled={!selectedOrganization} onClick={() => { setSelectedPlayerIds([]); setSetupStep(1); }}>Choose a format <ArrowRight size={15} /></button>{(data.organizations || []).length === 0 && <p className="tournament-inline-hint">Add an organization before creating a tournament.</p>}</section>}
        {setupStep === 1 && <section className="tournament-setup-page"><span className="tournament-step-kicker">STEP 2 · GAME PLAN</span><h3>Pick your tournament style</h3><p>Each format has its own rhythm. Choose the one that makes matchday feel right.</p><div className="tournament-format-grid">{[{ name: "Swiss System", title: "Swiss", description: "Everyone keeps playing. Pair players with similar scores each round.", icon: Shuffle, badge: "FAIR & FLEXIBLE" }, { name: "Single Elimination", title: "Single elimination", description: "Win and advance. One clean bracket from opening match to champion.", icon: Swords, badge: "WIN OR GO HOME" }, { name: "Round Robin", title: "Round robin", description: "Everyone plays everyone. The ultimate test of consistency.", icon: CircleDot, badge: "EVERYONE MEETS" }].map((option) => <button key={option.name} className={`tournament-format-card ${format === option.name ? "selected" : ""}`} onClick={() => setFormat(option.name)}><span className="tournament-format-icon"><option.icon size={21} /></span><small>{option.badge}</small><strong>{option.title}</strong><p>{option.description}</p><i>{format === option.name ? "Selected" : "Choose format"} {format === option.name && <Check size={13} />}</i></button>)}</div><div className="tournament-options"><label>Time control<select value={control} onChange={(e) => { setControl(e.target.value); setPreset(({ Bullet: "1+0", Blitz: "5+0", Rapid: "10+0", Classical: "60+0", Custom: "5+0" } as any)[e.target.value]); }}>{["Bullet", "Blitz", "Rapid", "Classical", "Custom"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Minutes + increment<input value={preset} onChange={(e) => setPreset(e.target.value)} /></label><label>Boards available<input type="number" min="1" value={boards} onChange={(e) => setBoards(Math.max(1, Number(e.target.value) || 1))} /></label>{format === "Swiss System" && <label>Swiss rounds<input type="number" min="1" value={roundCount} onChange={(e) => setRoundCount(Math.max(1, Number(e.target.value) || 1))} /></label>}</div><div className="tournament-step-actions"><button className="button" onClick={() => setSetupStep(0)}><ArrowLeft size={15} /> Back</button><button className="button tournament-next" onClick={() => setSetupStep(2)}>Review players <ArrowRight size={15} /></button></div></section>}
        {setupStep === 2 && <section className="tournament-setup-page"><span className="tournament-step-kicker">STEP 3 · THE LINEUP</span><h3>Your players are ready</h3><p>We found {eventPlayers.length} active players from {data.organizations?.find((o: any) => o.id === selectedOrganization)?.name || "your organization"}. Toggle anyone out before pairings.</p><div className="tournament-roster-tools"><label className="roster-search"><Users size={15} /><input value={rosterSearch} onChange={(e) => setRosterSearch(e.target.value)} placeholder="Find a player…" /></label><button className="text-button" onClick={() => setSelectedPlayerIds(players.length === eventPlayers.length ? ["__none__"] : eventPlayers.map((p: any) => p.id))}>{players.length === eventPlayers.length ? "Deselect all" : "Select all"}</button><strong>{players.length} playing</strong></div><div className="tournament-roster">{eventPlayers.filter((p: any) => p.name.toLowerCase().includes(rosterSearch.toLowerCase())).map((player: any, index: number) => { const checked = selectedPlayerIds.length === 0 || selectedPlayerIds.includes(player.id); return <label className={`tournament-roster-player ${checked ? "included" : ""}`} key={player.id}><input type="checkbox" checked={checked} onChange={() => { if (selectedPlayerIds.length === 0) setSelectedPlayerIds(eventPlayers.filter((p: any) => p.id !== player.id).map((p: any) => p.id)); else setSelectedPlayerIds(checked ? selectedPlayerIds.filter((id) => id !== player.id) : selectedPlayerIds.concat(player.id)); }} /><span className="roster-avatar">{player.name.slice(0, 1).toUpperCase()}</span><span className="roster-name"><strong>{player.name}</strong><small>{player.school || "Independent"}</small></span><b>{player.rating || "—"}</b></label>; })}{eventPlayers.length === 0 && <div className="tournament-empty-roster"><Users size={24} /><strong>No active players found</strong><span>Register players to this event or organization, then come back to the draw.</span></div>}</div><div className="tournament-step-actions"><button className="button" onClick={() => setSetupStep(1)}><ArrowLeft size={15} /> Back</button><button className="button tournament-next" disabled={players.length < 2} onClick={previewDraw}>Preview the draw <ArrowRight size={15} /></button></div>{players.length < 2 && <p className="tournament-inline-hint">At least two players are needed to create a tournament.</p>}</section>}
        {setupStep === 3 && <section className="tournament-setup-page"><span className="tournament-step-kicker">STEP 4 · THE DRAW</span><h3>Ready for the first move?</h3><p>{format} · {players.length} players · {control} {preset}</p>{format === "Single Elimination" ? <div className="tournament-draw-cards"><div className="draw-round-label">ROUND 1 <span>{previewPairings[0]?.length || 0} matches</span></div>{previewPairings[0]?.map((match, index) => <div className="draw-match" key={match.id}><span className="draw-board">{match.bye ? "BYE" : `BOARD ${index + 1}`}</span><strong>{players.find((p: any) => p.id === match.white)?.name || "—"}</strong><i>vs</i><strong>{match.bye ? "Advances directly" : players.find((p: any) => p.id === match.black)?.name || "—"}</strong>{match.bye && <Crown size={15} />}</div>)}</div> : <div className="swiss-pairings-scroll"><table className="swiss-pairings tournament-preview-table"><thead><tr><th>BOARD</th><th>WHITE</th><th>PTS</th><th>VS</th><th>PTS</th><th>BLACK</th></tr></thead><tbody>{previewPairings[0]?.map((match) => <tr key={match.id}><td>{match.bye ? "—" : match.board}</td><td>{players.find((p: any) => p.id === match.white)?.name}</td><td><span className="tournament-points">0.0</span></td><td>{match.bye ? <span className="tournament-bye">BYE · full point</span> : "⚔"}</td><td>{match.bye ? "—" : <span className="tournament-points">0.0</span>}</td><td>{match.bye ? "Automatic advance" : players.find((p: any) => p.id === match.black)?.name}</td></tr>)}</tbody></table></div>}<div className="tournament-step-actions"><button className="button" onClick={() => setSetupStep(2)}><ArrowLeft size={15} /> Edit lineup</button><button className="button tournament-next" onClick={start}><Trophy size={15} /> Start tournament</button></div></section>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
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
