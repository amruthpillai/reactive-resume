import { Redirect } from "expo-router";
import { routes } from "@/routes";

export default function Index() {
	return <Redirect href={routes.documents()} />;
}
