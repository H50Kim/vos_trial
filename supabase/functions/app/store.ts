export type VocDb = {
  users: Array<Record<string, unknown>>;
  opinions: Array<Record<string, unknown>>;
  votes: Array<Record<string, unknown>>;
  comments: Array<Record<string, unknown>>;
  ratings: Array<Record<string, unknown>>;
  nextNumber: number;
};

const emptyDb = (): VocDb => ({
  users: [],
  opinions: [],
  votes: [],
  comments: [],
  ratings: [],
  nextNumber: 1,
});

export function createStore(initial: VocDb | null, persist: (db: VocDb) => Promise<void>) {
  let db: VocDb = initial
    ? {
        users: Array.isArray(initial.users) ? initial.users : [],
        opinions: Array.isArray(initial.opinions) ? initial.opinions : [],
        votes: Array.isArray(initial.votes) ? initial.votes : [],
        comments: Array.isArray(initial.comments) ? initial.comments : [],
        ratings: Array.isArray(initial.ratings) ? initial.ratings : [],
        nextNumber: Number(initial.nextNumber) > 0 ? Number(initial.nextNumber) : 1,
      }
    : emptyDb();

  let writeChain = Promise.resolve();

  function assignMissingNumbers() {
    let max = 0;
    for (const opinion of db.opinions) {
      const number = Number(opinion.number);
      if (Number.isFinite(number) && number > max) max = number;
    }
    let next = Math.max(max + 1, Number(db.nextNumber) || 1);
    const ordered = [...db.opinions].sort(
      (a, b) => new Date(String(a.createdAt)).getTime() - new Date(String(b.createdAt)).getTime(),
    );
    for (const opinion of ordered) {
      const number = Number(opinion.number);
      if (!Number.isFinite(number) || number < 1) {
        opinion.number = next;
        next += 1;
      }
    }
    db.nextNumber = next;
  }

  function takeNumber() {
    assignMissingNumbers();
    const number = db.nextNumber;
    db.nextNumber += 1;
    return number;
  }

  function save() {
    writeChain = writeChain.then(() => persist(db));
    return writeChain;
  }

  assignMissingNumbers();

  return {
    findUserByEmailHash(emailHash: string) {
      return db.users.find((user) => user.emailHash === emailHash) ?? null;
    },
    findUserById(id: string) {
      return db.users.find((user) => user.id === id) ?? null;
    },
    async createUser({ emailHash, anonId }: { emailHash: string; anonId: string }) {
      const existing = db.users.find((user) => user.emailHash === emailHash);
      if (existing) return existing;
      const user = {
        id: crypto.randomUUID(),
        emailHash,
        anonId,
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
      await save();
      return user;
    },
    listOpinions() {
      return [...db.opinions].sort(
        (a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime(),
      );
    },
    findOpinionById(id: string) {
      return db.opinions.find((item) => item.id === id) ?? null;
    },
    async createOpinion({
      userId,
      ask,
      others,
      priority,
      source = "app",
      formKey = "",
      status = "open",
      kind = "proposal",
      askEn = "",
      othersEn = "",
      askTranslatedFrom = "",
      othersTranslatedFrom = "",
    }: {
      userId: string;
      ask: string;
      others: string;
      priority: number;
      source?: string;
      formKey?: string;
      status?: string;
      kind?: string;
      askEn?: string;
      othersEn?: string;
      askTranslatedFrom?: string;
      othersTranslatedFrom?: string;
    }) {
      const id = crypto.randomUUID();
      const nextKind = kind === "share" || kind === "notice" ? kind : "proposal";
      const opinion = {
        id,
        number: takeNumber(),
        userId,
        ask,
        others,
        askEn,
        othersEn,
        askTranslatedFrom,
        othersTranslatedFrom,
        priority,
        kind: nextKind,
        status: nextKind === "share" || nextKind === "notice" ? "none" : status === "done" ? "done" : "open",
        source,
        formKey: formKey || `app:${userId}:${id}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.opinions.push(opinion);
      await save();
      return opinion;
    },
    async updateOpinion(
      id: string,
      {
        ask,
        others,
        priority,
        status,
        kind,
        askEn,
        othersEn,
        askTranslatedFrom,
        othersTranslatedFrom,
      }: {
        ask: string;
        others: string;
        priority: number;
        status?: string;
        kind?: string;
        askEn?: string;
        othersEn?: string;
        askTranslatedFrom?: string;
        othersTranslatedFrom?: string;
      },
    ) {
      const opinion = db.opinions.find((item) => item.id === id);
      if (!opinion) return null;
      opinion.ask = ask;
      opinion.others = others;
      opinion.priority = priority;
      if (kind === "share" || kind === "proposal" || kind === "notice") opinion.kind = kind;
      if (opinion.kind === "share" || opinion.kind === "notice") {
        opinion.status = "none";
      } else if (status === "open" || status === "done") {
        opinion.status = status;
      }
      if (askEn !== undefined) opinion.askEn = askEn;
      if (othersEn !== undefined) opinion.othersEn = othersEn;
      if (askTranslatedFrom !== undefined) opinion.askTranslatedFrom = askTranslatedFrom;
      if (othersTranslatedFrom !== undefined) opinion.othersTranslatedFrom = othersTranslatedFrom;
      opinion.updatedAt = new Date().toISOString();
      await save();
      return opinion;
    },
    async saveTranslations(
      id: string,
      {
        askEn,
        othersEn,
        askTranslatedFrom,
        othersTranslatedFrom,
      }: {
        askEn?: string;
        othersEn?: string;
        askTranslatedFrom?: string;
        othersTranslatedFrom?: string;
      },
    ) {
      const opinion = db.opinions.find((item) => item.id === id);
      if (!opinion) return null;
      opinion.askEn = askEn ?? "";
      opinion.othersEn = othersEn ?? "";
      opinion.askTranslatedFrom = askTranslatedFrom ?? "";
      opinion.othersTranslatedFrom = othersTranslatedFrom ?? "";
      await save();
      return opinion;
    },
    async deleteOpinion(id: string) {
      const index = db.opinions.findIndex((item) => item.id === id);
      if (index < 0) return false;
      db.opinions.splice(index, 1);
      db.votes = db.votes.filter((vote) => vote.opinionId !== id);
      db.comments = db.comments.filter((comment) => comment.opinionId !== id);
      db.ratings = db.ratings.filter((rating) => rating.opinionId !== id);
      await save();
      return true;
    },
    listComments(opinionId: string) {
      return db.comments
        .filter((comment) => comment.opinionId === opinionId)
        .sort((a, b) => new Date(String(a.createdAt)).getTime() - new Date(String(b.createdAt)).getTime());
    },
    findCommentById(id: string) {
      return db.comments.find((comment) => comment.id === id) ?? null;
    },
    async addComment({
      opinionId,
      userId,
      body,
      bodyEn = "",
      bodyTranslatedFrom = "",
    }: {
      opinionId: string;
      userId: string;
      body: string;
      bodyEn?: string;
      bodyTranslatedFrom?: string;
    }) {
      const comment = {
        id: crypto.randomUUID(),
        opinionId,
        userId,
        body,
        bodyEn,
        bodyTranslatedFrom,
        createdAt: new Date().toISOString(),
      };
      db.comments.push(comment);
      await save();
      return comment;
    },
    async updateComment(
      id: string,
      body: string,
      translations: { bodyEn?: string; bodyTranslatedFrom?: string } = {},
    ) {
      const comment = db.comments.find((item) => item.id === id);
      if (!comment) return null;
      comment.body = body;
      if (translations.bodyEn !== undefined) comment.bodyEn = translations.bodyEn;
      if (translations.bodyTranslatedFrom !== undefined) comment.bodyTranslatedFrom = translations.bodyTranslatedFrom;
      comment.updatedAt = new Date().toISOString();
      await save();
      return comment;
    },
    async saveCommentTranslations(
      id: string,
      { bodyEn, bodyTranslatedFrom }: { bodyEn?: string; bodyTranslatedFrom?: string },
    ) {
      const comment = db.comments.find((item) => item.id === id);
      if (!comment) return null;
      comment.bodyEn = bodyEn ?? "";
      comment.bodyTranslatedFrom = bodyTranslatedFrom ?? "";
      await save();
      return comment;
    },
    async deleteComment(id: string) {
      const index = db.comments.findIndex((comment) => comment.id === id);
      if (index < 0) return false;
      db.comments.splice(index, 1);
      await save();
      return true;
    },
    listRatings(opinionId: string) {
      return db.ratings.filter((rating) => rating.opinionId === opinionId);
    },
    async upsertRating(userId: string, opinionId: string, stars: number) {
      const existing = db.ratings.find((rating) => rating.userId === userId && rating.opinionId === opinionId);
      const now = new Date().toISOString();
      if (existing) {
        existing.stars = stars;
        existing.updatedAt = now;
        await save();
        return existing;
      }
      const rating = { id: crypto.randomUUID(), userId, opinionId, stars, createdAt: now, updatedAt: now };
      db.ratings.push(rating);
      await save();
      return rating;
    },
    findVote(userId: string, opinionId: string) {
      return db.votes.find((vote) => vote.userId === userId && vote.opinionId === opinionId) ?? null;
    },
    countVotes(opinionId: string) {
      return db.votes.filter((vote) => vote.opinionId === opinionId).length;
    },
    async addVote(userId: string, opinionId: string) {
      const vote = { id: crypto.randomUUID(), userId, opinionId, createdAt: new Date().toISOString() };
      db.votes.push(vote);
      await save();
      return vote;
    },
  };
}
