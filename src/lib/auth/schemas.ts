import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("فرمت آدرس ایمیل وارد شده معتبر نیست").max(255),
  password: z
    .string()
    .min(8, "رمز عبور باید حداقل حاوی ۸ کاراکتر باشد")
    .max(100),
});
