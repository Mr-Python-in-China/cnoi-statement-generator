import z from "zod";

export type DateArr = z.infer<typeof import("./contentZod").zDateArr>;
export type Content = z.infer<typeof import("./contentZod").default>;
