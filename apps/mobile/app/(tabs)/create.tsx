import { Redirect } from "expo-router";
import { routes } from "@/routes";

export default function CreateTab() {
	return <Redirect href={routes.new()} />;
}
