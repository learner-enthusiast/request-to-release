import UserService from "@repo/services/user";
import FormService from "@repo/services/forms";
import QuestionService from "@repo/services/questions";
import FormResponseService from "@repo/services/form-responses";
export const userService = new UserService();
export const formService = new FormService();
export const questionService = new QuestionService();
export const formResponseService = new FormResponseService();
