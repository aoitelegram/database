interface EventDataMap<Value, Class> {
  create: {
    table: string;
    variable: string;
    data: Value;
  };
  update: {
    table: string;
    variable: string;
    newData: Value;
    oldData: Value;
  };
  delete: {
    table: string;
    variable: string | string[];
    data: Value | Value[];
  };
  deleteAll: {
    table: string;
    variables: { [key: string]: Value };
  };
  ready: Class;
}

export { EventDataMap };
