export async function fetchJson(url, options = {}) {

    const res = await fetch(url, options);

    if (!res.ok) {
        throw new Error(
            `${res.status} ${res.statusText}`
        );
    }

    return await res.json();

}
