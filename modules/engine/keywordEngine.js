export function buildKeywords(plan){

    return Array.isArray(plan.imageQueries)
        ? plan.imageQueries
        : [];

}
