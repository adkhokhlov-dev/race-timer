// const TS_OFFSET= new Date().getTimezoneOffset() * 60_000;
const DEFAULT_INTERVAL = 15;
const STORAGE_KEY = "config";

const COLORS = Object.values({
  "Yellow 0": "#fcf9e8",
  "Yellow 5": "#f5e6ab",
  "Yellow 10": "#f2d675",
  "Yellow 20": "#f0c33c",
  "Yellow 30": "#dba617",
  "Yellow 40": "#bd8600",
  "Yellow 50": "#996800",
  "Yellow 60": "#755100",
  "Yellow 70": "#614200",
  "Yellow 80": "#4a3200",
  "Yellow 90": "#362400",
  "Yellow 100": "#211600",
})
  .reverse()
  .slice(4);


class Race {
  name;
  interval: number;
  racers: Racer[];
  laps: number[];
  constructor(name: string, interval = DEFAULT_INTERVAL, racers: Racer[] = [], laps: number[] = []) {
    this.name = name;
    this.interval = interval;
    this.racers = racers;
    this.laps = laps;
  }

  static parse(json: Json) {
    return new Race(
      json.name,
      json.interval,
      json.racers.map((v: Json) => new Racer(v.id, v.name, v.laps)),
      json.laps
    );
  }
}


class Racer {
  id;
  name;
  laps: Lap[];
  constructor(number: any, name = "", laps = []) {
    this.id = number;
    this.name = name;
    this.laps = laps;
  }
}

interface Lap { time: number; position?: number; delays: string[] }

interface Participant { id: number; name: string; laps: Lap[] }

type Json = Record<string, any>;


export class Timer {
  editMode = false;
  interval = DEFAULT_INTERVAL;
  number: number = NaN;
  name = "";
  participants: Participant[] = [];
  participantsSorted: Participant[] = [];
  laps: number[] = [];

  races: Race[] = [];
  selectedRace: string | null = null;

  init() {
    const config = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '');

    if (config?.races && config.races.length) {
      this.races = config.races.map((v: Json) => Race.parse(v));
      this.selectedRace = config.selectedRace ?? null;
      setTimeout(() => {
        this.changeRace(this.races.find((v) => v.name === this.selectedRace));
      }, 1);
    }
  }

  onRaceChange(value: string) {
    const race = this.races.find((v) => v.name === value);
    this.changeRace(race);
  }

  addRace() {
    const raceName = prompt("Название гонки");
    if (raceName) {
      const newRace = new Race(raceName);
      this.races.push(newRace);
      setTimeout(() => {
        this.selectedRace = raceName;
        this.changeRace(newRace);
        this.editMode = true;
      }, 1);
    }
  }

  editRace() {
    this.editMode = true;
  }

  deleteRace() {
    if (confirm("Гонка будет удалена")) {
      this.races = this.races.filter((v) => v.name !== this.selectedRace);
      this.changeRace(this.races[0]);
    }
  }

  saveRace(endAction = false) {
    const race = this.races.find((v) => v.name === this.selectedRace);
    if (race) {
      race.interval = this.interval;
      race.laps = this.laps;
      race.racers = this.participants;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ races: this.races, selectedRace: this.selectedRace })
    );
    if (endAction) this.editMode = false;
  }

  changeRace(race?: Race) {
    this.selectedRace = race?.name ?? null;
    this.interval = race?.interval ?? DEFAULT_INTERVAL;
    this.laps = race?.laps ?? [];
    this.setParticipants(race?.racers ?? []);
    this.saveRace();
  }

  resetRace() {
    this.laps = [];
    this.participants.forEach((p) => (p.laps = []));
    this.saveRace();
  }

  setParticipants(participants: Participant[]) {
    this.participants = this.participantsSorted = participants
      .map(({ id, name, laps }, i) => ({
        id: id ?? i + 1,
        name,
        laps,
      }))
      .sort((p1, p2) => p1.id - p2.id);
  }

  addParticipants() {
    const res = prompt("Список номеров и гонщиков");
    if (res) {
      const racers = res.split(/\s/).reduce<Racer[]>((acc, v) => {
        const num = +v;
        if (isNaN(num) && acc.length) {
          acc[acc.length - 1].name += " " + v;
        } else {
          acc.push(new Racer(num));
        }
        return acc;
      }, []);
      // const participants = racers.map((v) => v.toCortege());
      // console.log(participants);
      this.setParticipants([...this.participants, ...racers]);
      this.saveRace();
    }

  }

  deleteRacer(number: number) {
    this.participants = this.participants.filter((v) => v.id != number);
    this.saveRace();
  }

  check(id: number) {
    const participant = this.getById(id);
    if (!participant) return;

    participant.laps.push({ time: Date.now(), delays: [] });
    const lap = participant.laps.length;

    this.participantsSorted = [...this.participants]
      // .filter((v) => v.laps[lap - 1])
      .sort((p1, p2) => this.dif(p1, p2, lap - 1));
    console.log(JSON.parse(JSON.stringify(this.participantsSorted)));

    this.updateParticipants(lap);
    console.log(JSON.parse(JSON.stringify(this.participants)));

    if (participant.laps.length > this.laps.length)
      this.laps.push(this.laps.length + 1);

    this.saveRace();
  }

  updateParticipants(currentLap: number) {
    for (const participant of this.participants) {
      const lap = participant.laps[currentLap - 1];
      if (lap) {
        lap.position = participant.laps[currentLap - 1]
          ? this.participantsSorted.findIndex((v) => v === participant) + 1
          : undefined;

        lap.delays = this.participantsSorted
          // .slice(0, 3)
          .map<[Participant, number]>((p) => [p, this.dif(participant, p, currentLap - 1)])
          .filter(([, dif]) => dif > 0)
          .filter((_v, i, arr) => i == 0 || i > arr.length - 3)
          .map(([p, dif]) => this.formatTime(p, dif));
      }
    }
  }
  getById(id: number) {
    return this.participants.find((v) => v.id === id);
  }

  getColor(position: number) {
    return `background-color: ${COLORS[position]}`;
  }

  startOffset(participant: Participant) {
    console.log(participant.id, participant.id * this.interval);
    return participant.id * this.interval * 1000;
  }

  dif(p1: Participant, p2: Participant, lap: number): number {
    // if (!p1.laps[lap] || !p2.laps[lap]) return -1;
    const time1 = (p1.laps[lap]?.time ?? Number.MAX_SAFE_INTEGER) - this.startOffset(p1);
    const time2 = (p2.laps[lap]?.time ?? Number.MAX_SAFE_INTEGER) - this.startOffset(p2);
    return time1 - time2;
  }

  formatTime(participant: Participant, time: number) {
    // return new Date(time + this.tzOffset).toLocaleTimeString();
    // const milliseconds = Math.floor(time / 10) % 100;
    const seconds = Math.floor(time / 1000) % 60;
    const minutes = Math.floor(time / 60_000);

    // return `+${addZero(minutes)}:${addZero(seconds)}.${milliseconds}`;
    return `(${participant.id})+${addZero(minutes)}:${addZero(seconds)}`;

    function addZero(number: number) {
      return number < 10 ? "0" + number : number;
    }
  }
}


