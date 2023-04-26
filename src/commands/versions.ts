import axios from "axios";

export default async function () {
  try {
    const response = await axios.get(
      `${process.env.DOCKER_REGISTRY_TAGS_VERSION_URL}`
    );

    console.log(response.data.results.map((s: any) => s.name).join("\n"));
  } catch (error) {
    console.log(error);
  }
}
