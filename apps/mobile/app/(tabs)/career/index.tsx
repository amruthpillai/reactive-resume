import { Redirect } from "expo-router";
import { routes } from "@/routes";

export default function CareerIndex() {
	return <Redirect href={routes.career()} />;
}
