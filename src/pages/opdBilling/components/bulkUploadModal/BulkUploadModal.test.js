import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import BulkUploadModal from "./BulkUploadModal";

jest.mock("../../service", () => ({
  bulkInsertBillItems: jest.fn(() => Promise.resolve({ count: 1 })),
}));

// helper.js pulls in firebase/azure — stub the only function the modal uses
jest.mock("../../utils/helper", () => ({
  calculateTotalAmount: (item) => item.price,
}));

jest.mock("../../../../common/CommonModal", () => ({ title, modalBody }) => (
  <div>
    <div>{title}</div>
    {modalBody}
  </div>
));

beforeAll(() => {
  window.matchMedia =
    window.matchMedia ||
    (() => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
});

// header + 2 valid rows (incl. special-char name at zero price) + 3 invalid rows
// (missing type, negative price, gst > 100)
const CSV = [
  "Type *,Name *,Price *,Discount Type,Discount,GST (%)",
  "Service,Good Item,500,percentage,10,5",
  ",No Type,100,,,",
  "Service,Bad Price,-5,,,",
  "Service,High GST,100,,,150",
  "Service,Free Camp @ Clinic #1!,0,,,",
].join("\n");

async function renderWithFile() {
  const utils = render(<BulkUploadModal onCancel={jest.fn()} onSuccess={jest.fn()} isDentalEnabled />);
  // the file input is hidden (triggered via the drop zone), so no accessible query exists
  // eslint-disable-next-line testing-library/no-node-access
  const input = document.querySelector('input[type="file"]');
  const file = new File([CSV], "items.csv", { type: "text/csv" });
  fireEvent.change(input, { target: { files: [file] } });
  await screen.findByText("5 total");
  return utils;
}

const tableBodyRows = () =>
  // eslint-disable-next-line testing-library/no-node-access
  document.querySelectorAll(".ant-table-tbody tr.ant-table-row");

describe("BulkUploadModal validation review", () => {
  test("shows clickable total / valid / invalid counters", async () => {
    await renderWithFile();
    expect(screen.getByText("5 total")).toBeInTheDocument();
    expect(screen.getByText("2 valid")).toBeInTheDocument();
    expect(screen.getByText(/3 invalid/)).toBeInTheDocument();
  });

  test("clicking Invalid filters the grid to invalid rows only", async () => {
    await renderWithFile();
    fireEvent.click(screen.getByText(/3 invalid/));
    await waitFor(() => expect(tableBodyRows()).toHaveLength(3));
    expect(screen.queryByText("Good Item")).not.toBeInTheDocument();
    expect(screen.getByText("No Type")).toBeInTheDocument();
  });

  test("clicking Valid filters the grid to valid rows only", async () => {
    await renderWithFile();
    fireEvent.click(screen.getByText("2 valid"));
    await waitFor(() => expect(tableBodyRows()).toHaveLength(2));
    expect(screen.getByText("Good Item")).toBeInTheDocument();
    expect(screen.getByText("Free Camp @ Clinic #1!")).toBeInTheDocument();
    expect(screen.queryByText("No Type")).not.toBeInTheDocument();
  });

  test("clicking All restores the full grid", async () => {
    await renderWithFile();
    fireEvent.click(screen.getByText(/3 invalid/));
    await waitFor(() => expect(tableBodyRows()).toHaveLength(3));
    fireEvent.click(screen.getByText("5 total"));
    await waitFor(() => expect(tableBodyRows()).toHaveLength(5));
  });

  test("invalid rows show file row number, failing column and message", async () => {
    await renderWithFile();
    const rows = tableBodyRows();
    // CSV data starts at file row 2; "No Type" is file row 3
    const noTypeRow = Array.from(rows).find((r) => within(r).queryByText("No Type"));
    expect(within(noTypeRow).getByText("3")).toBeInTheDocument();
    expect(within(noTypeRow).getByText("Type:")).toBeInTheDocument();
    expect(within(noTypeRow).getByText(/Type is mandatory/)).toBeInTheDocument();
    const badPriceRow = Array.from(rows).find((r) => within(r).queryByText("Bad Price"));
    expect(within(badPriceRow).getByText(/Must be a number ≥ 0/)).toBeInTheDocument();
    const gstRow = Array.from(rows).find((r) => within(r).queryByText("High GST"));
    expect(within(gstRow).getByText(/Must be ≤ 100/)).toBeInTheDocument();
  });

  test("shows Download invalid rows button when invalid rows exist", async () => {
    await renderWithFile();
    expect(screen.getByRole("button", { name: /download invalid rows/i })).toBeInTheDocument();
  });
});
