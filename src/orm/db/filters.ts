import type { DBFilter, FilterAll, InFilter } from "#/orm/db/db-types.ts";
import { raiseORMException } from "#/orm/orm-exception.ts";
import { formatColumnName, formatDbValue } from "#/orm/db/utils.ts";

export function makeFilterQuery(dbFilter: DBFilter): Array<string> {
  const filterQ: Array<string> = [];
  const filters: Array<InFilter> = [];
  if (Array.isArray(dbFilter)) {
    filters.push(...dbFilter);
  } else if (typeof dbFilter === "object") {
    filters.push(
      ...Object.entries(dbFilter).map(([key, value]) => {
        if (value === null) {
          return {
            field: key,
            op: "isEmpty",
          };
        }
        return {
          field: key,
          op: "=",
          value,
        };
      }) as Array<InFilter>,
    );
  }
  for (const filter of filters) {
    let filterString = "";
    const strings: Array<string> = [];
    let baseFilter = "";
    let andFilter = "";
    let orFilter = "";
    if ("op" in filter) {
      baseFilter = makeFilter(filter.field, filter);
      strings.push(baseFilter);
    }
    if (filter.and) {
      andFilter = filter.and.map((f) => {
        return makeFilter(filter.field, f);
      }).join(" AND ");
      strings.push(andFilter);
    }
    if (filter.or) {
      orFilter = filter.or.map((f) => {
        return makeFilter(filter.field, f);
      }).join(" OR ");
      strings.push(orFilter);
    }

    if (andFilter && orFilter) {
      filterString = `( (${orFilter})`;
    } else if (andFilter) {
      filterString = andFilter;
    } else if (orFilter) {
      filterString = orFilter;
    }

    filterString = strings.map((s) => {
      return `(${s})`;
    }).join(" AND ");
    filterQ.push(filterString);
  }
  return filterQ;
}

export function makeFilter(field: string, filter: FilterAll): string {
  let filterString = "";
  const column = formatColumnName(field);

  const operator = filter.op;

  switch (operator) {
    case "=":
    case "equal":
      filterString = `${column} = ${formatDbValue(filter.value)}`;
      break;
    case "!=":
    case "notEqual":
      filterString = `${column} <> ${formatDbValue(filter.value)}`;
      break;

    case ">":
    case "greaterTan":
      filterString = `${column} >${formatDbValue(filter.value)}`;
      break;
    case "<":
    case "lessThan":
      filterString = `${column} < ${formatDbValue(filter.value)}`;
      break;
    case "greaterThanOrEqual":
    case ">=":
      filterString = `${column} >= ${formatDbValue(filter.value)}`;
      break;
    case "lessThanOrEqual":
    case "<=":
      filterString = `${column} <= ${formatDbValue(filter.value)}`;
      break;
    case "contains":
      filterString = `${column} ${filter.caseSensitive ? "LIKE" : "ILIKE"} '%${
        formatDbValue(filter.value, false, true)
      }%'`;
      break;
    case "notContains":
      filterString = `${column} NOT ${
        filter.caseSensitive ? "LIKE" : "ILIKE"
      } '%${formatDbValue(filter.value, false, true)}%'`;
      break;
    case "startsWith":
      filterString = `${column} ${filter.caseSensitive ? "LIKE" : "ILIKE"} '${
        formatDbValue(filter.value, false, true)
      }%'`;
      break;
    case "endsWith":
      filterString = `${column} ${filter.caseSensitive ? "LIKE" : "ILIKE"} '%${
        formatDbValue(filter.value, false, true)
      }'`;
      break;
    case "isEmpty":
      filterString = `${column} IS NULL`;
      break;
    case "isNotEmpty":
      filterString = `${column} IS NOT NULL`;
      break;
    case "inList":
      filterString = `${column} IN (${formatDbValue(filter.value, true)})`;
      break;
    case "notInList":
      filterString = `${column} NOT IN (${formatDbValue(filter.value, true)})`;
      break;
    case "between":
      {
        filterString = `${column} BETWEEN ${
          formatDbValue(filter.value[0])
        } AND ${formatDbValue(filter.value[1])}`;
      }
      break;
    case "notBetween":
      {
        filterString = `${column} NOT BETWEEN ${
          formatDbValue(filter.value[0])
        } AND ${formatDbValue(filter.value[1])}`;
      }
      break;
    default:
      raiseORMException(
        `filter operation ${filter} is not an valid option`,
      );
  }
  return filterString;
}
