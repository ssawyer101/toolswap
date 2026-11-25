// Fills an EMPTY database with example people, groups, tools and loans so you can try the app.
// Every example account uses the password: toolswap123
// Usage: npm run seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
if ((await db.user.count()) > 0) {
  console.log("The database already has people in it, so no examples were added.");
  process.exit(0);
}
const hash = await bcrypt.hash("toolswap123", 11);
const day = (n) => { const d = new Date(); d.setUTCHours(12, 0, 0, 0); return new Date(+d + n * 864e5); };

const people = [
  ["you@example.com", "Dana Example", "Elm St area"],
  ["mike@example.com", "Mike Ramirez", "Oak Ridge"],
  ["sarah@example.com", "Sarah Kim", "Westside"],
  ["jim@example.com", "Pastor Jim Hale", "By the church"],
  ["tony@example.com", "Tony Bianchi", "Route 9"],
  ["gina@example.com", "Gina Lowe", "Millbrook"],
];
const U = {};
for (const [email, name, area] of people) U[email.split("@")[0]] = await db.user.create({ data: { email, name, area, passwordHash: hash } });

const group = async (name, code, admin, members) => db.group.create({ data: { name, inviteCode: code, memberships: { create: [
  { userId: U[admin].id, role: "ADMIN", status: "ACTIVE" }, ...members.map((m) => ({ userId: U[m].id, status: "ACTIVE" })),
] } } });
const G = {
  church: await group("Grace Church Men's Group", "GRACE-4821", "jim", ["you", "mike", "gina"]),
  hotrod: await group("Valley Hot Rod Club", "HOTROD-1932", "mike", ["you", "sarah", "tony"]),
  riders: await group("Iron Riders MC", "IRON-7710", "tony", ["you", "sarah", "gina"]),
};
const T = {};
const tool = async (key, owner, name, category, value, groups, extra = {}) =>
  (T[key] = await db.tool.create({ data: { ownerId: U[owner].id, name, category, value, ...extra, shares: { create: groups.map((g) => ({ groupId: G[g].id })) } } }));

await tool("drill", "mike", "DeWalt 20V cordless drill", "Power tools", 120, ["church", "hotrod"], { tip: "The clutch ring must be on the drill symbol to drill. On the numbers it slips on purpose.", link: "https://www.dewalt.com/", description: "Comes with 2 batteries, charger and a small bit set in the case." });
await tool("jack3", "mike", "Floor jack, 3 ton", "Automotive", 180, ["hotrod"], { tip: "Turn the release handle fully clockwise before pumping, or it won't lift." });
await tool("stands1", "mike", "Jack stands (pair)", "Automotive", 60, ["hotrod"]);
await tool("ladder", "mike", "Extension ladder, 24 ft", "Ladders", 250, ["church"]);
await tool("torque1", "mike", "Torque wrench, 1/2 in", "Hand tools", 90, ["hotrod"], { tip: "Set it back to the lowest number when you're done. Stored at high tension it loses accuracy." });
await tool("hoist", "sarah", "Engine hoist, 2 ton", "Automotive", 300, ["hotrod", "riders"]);
await tool("torque2", "sarah", "Torque wrench, 1/2 in drive", "Hand tools", 110, ["hotrod", "riders"]);
await tool("lift", "sarah", "Motorcycle lift table", "Automotive", 650, ["riders"], { tip: "The lock bar must click into a notch before you work under load." });
await tool("washer", "jim", "Pressure washer, 3100 PSI", "Outdoor & yard", 350, ["church"], { tip: "Hold the red primer bulb down 3 seconds before you pull the cord, or it won't start.", video: "https://www.youtube.com/results?search_query=pressure+washer+primer+bulb" });
await tool("tables", "jim", "Folding tables (6)", "Event & party", 240, ["church"]);
await tool("welder", "tony", "MIG welder, 140A", "Welding", 520, ["hotrod", "riders"], { tip: "Set up for flux-core wire. Please return it with the spool you got." });
await tool("jack2", "tony", "Floor jack, 2 ton", "Automotive", 90, ["hotrod", "riders"]);
await tool("stands2", "tony", "Jack stands (pair), 3 ton", "Automotive", 45, ["hotrod", "riders"]);
await tool("tilesaw", "gina", "Wet tile saw", "Power tools", 280, ["church", "riders"]);
await tool("circ", "you", "Circular saw, 7-1/4 in", "Power tools", 110, ["church", "hotrod"], { tip: "The blade guard sticks a little. Push the lever with your thumb to start the cut." });
await tool("sockets", "you", "Socket set, 120 pc", "Hand tools", 150, ["hotrod", "riders"]);
await tool("vac", "you", "Shop vac, 12 gal", "Cleaning", 90, ["church", "hotrod", "riders"]);
await tool("chainsaw", "you", "Chainsaw, 18 in", "Outdoor & yard", 200, [], { tip: "Only lending this to people I know well, so it's not shared with any group yet." });

const loan = (t, borrower, status, start, due, extra = {}) => db.loan.create({ data: {
  toolId: T[t].id, lenderId: T[t].ownerId, borrowerId: U[borrower].id, status, startDate: day(start), dueDate: day(due),
  pickedUpAt: status === "OUT" ? day(start) : null, ...extra } });
await loan("welder", "you", "OUT", -11, 3);
await loan("washer", "you", "OUT", -15, -3);
await loan("sockets", "tony", "OUT", -7, 7);
await loan("vac", "gina", "REQUESTED", 2, 5, { note: "For cleaning up after Thanksgiving." });
const l = await loan("ladder", "sarah", "OUT", -5, 9);
await db.message.create({ data: { loanId: l.id, authorId: U.sarah.id, body: "Thanks Mike! I'll have it back the weekend after next." } });

console.log("Added example data. Log in as you@example.com (or mike@, sarah@, jim@, tony@, gina@example.com) with password toolswap123");
await db.$disconnect();
