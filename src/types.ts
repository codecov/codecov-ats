export interface Exec {
  args: string[],
  failCi: boolean,
  os: string,
  uploaderVersion: string,
  verbose: boolean,
}

export interface CliArgs {
  args: string[],
  failCi: boolean,
  filename: string,
}
