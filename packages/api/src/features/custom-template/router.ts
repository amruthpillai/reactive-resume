import { customTemplateCrudRouter } from "./crud";

export const customTemplateRouter = {
	list: customTemplateCrudRouter.list,
	getById: customTemplateCrudRouter.getById,
	create: customTemplateCrudRouter.create,
	update: customTemplateCrudRouter.update,
	delete: customTemplateCrudRouter.delete,
};
