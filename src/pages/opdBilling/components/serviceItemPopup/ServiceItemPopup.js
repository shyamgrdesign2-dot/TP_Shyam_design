import { Input, Drawer, AutoComplete } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { ASSETS } from "../../../../assets";
import { Button } from "react-bootstrap";
import { useEffect, useMemo, useState } from "react";
import {
  upsertBillItem,
  getBillItemTypes,
  createBillItemType,
  deleteBillItemType,
} from "../../service";
import { useSelector } from "react-redux";
import { calculateTotalAmount } from "../../utils/helper";
import {
  getClinic,
  onlyDecimalFormat,
  trackEvent,
} from "../../../../utils/utils";

const BILL_ITEM_TYPE_OPTIONS = [
  { label: "Clinical services", value: "Service" },
  { label: "Consumables", value: "Consumables" },
  { label: "Dental services", value: "Dental_Service" },
];

const DENTAL_ONLY_TYPE = "Dental_Service";

const ServiceItemPopup = ({
  onCancel,
  editIndex,
  item,
  setDataSource,
  addRow,
  setSearchQuery,
  onSaved,
  dentalOnly = false,
  zIndex,
}) => {
  const { advancedSettings } = useSelector((state) => state.billing);
  const [serviceItem, setServiceItem] = useState({
    id: item?.id || item?.masterId,
    name: item?.name,
    type: dentalOnly ? DENTAL_ONLY_TYPE : item?.type,
    price: item?.price || item?.amount,
    discount: item?.discount,
    discountType: item?.discountType || advancedSettings?.defaultDiscountType || "flat",
    gst: item?.gst,
  });
  const [billItemTypes, setBillItemTypes] = useState([]);
  const [typeSearch, setTypeSearch] = useState(() =>
    dentalOnly ? "" : item?.type ? String(item.type) : ""
  );
  const [typesLoading, setTypesLoading] = useState(false);
  const [creatingType, setCreatingType] = useState(false);
  const [deletingTypeId, setDeletingTypeId] = useState(null);

  useEffect(() => {
    if (!dentalOnly) return;
    setServiceItem((prev) =>
      prev.type === DENTAL_ONLY_TYPE ? prev : { ...prev, type: DENTAL_ONLY_TYPE }
    );
  }, [dentalOnly]);

  useEffect(() => {
    if (dentalOnly) return;
    let cancelled = false;
    const loadTypes = async () => {
      setTypesLoading(true);
      const types = await getBillItemTypes();
      if (cancelled) return;

      const nextTypes = Array.isArray(types) ? types : [];
      setBillItemTypes(nextTypes);

      const currentType = item?.type;
      if (!currentType) {
        setTypeSearch("");
        setServiceItem((prev) => ({ ...prev, type: undefined }));
      } else {
        const selected = nextTypes.find(
          (t) => t?.name === currentType || t?.displayName === currentType
        );
        if (selected) {
          setTypeSearch(selected.displayName || selected.name);
          setServiceItem((prev) => ({ ...prev, type: selected.name }));
        } else {
          // Keep the item's own type visible even if not in the fetched list
          setTypeSearch(String(currentType));
          setServiceItem((prev) => ({ ...prev, type: currentType }));
        }
      }
      setTypesLoading(false);
    };
    loadTypes();
    return () => {
      cancelled = true;
    };
  }, [dentalOnly, editIndex, item?.type]);

  const { profile } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);
  const {
    close: closeIcon
  } = ASSETS.images;

  const handleServiceItem = (key, value) => {
    setServiceItem((prev) => {
      return {
        ...prev,
        [key]: value,
        ...(key === "discountType" && { discount: undefined }),
      };
    });
  };

  const trimmedTypeSearch = typeSearch.trim();
  const canAddCustomType =
    !!trimmedTypeSearch &&
    !(billItemTypes || []).some((type) => {
      const displayName = String(type?.displayName || "").toLowerCase();
      const name = String(type?.name || "").toLowerCase();
      const query = trimmedTypeSearch.toLowerCase();
      return displayName === query || name === query;
    });

  const typeAutoCompleteOptions = useMemo(() => {
    const query = trimmedTypeSearch.toLowerCase();
    const options = (billItemTypes || [])
      .filter((type) => {
        if (!query) return true;
        const displayName = String(type?.displayName || "").toLowerCase();
        const name = String(type?.name || "").toLowerCase();
        return displayName.includes(query) || name.includes(query);
      })
      .map((type) => ({
        value: type?.name,
        label: type?.displayName || type?.name,
        id: type?.id,
        clinicId: type?.clinicId,
      }));

    if (canAddCustomType) {
      options.push({
        value: `__add_custom__:${trimmedTypeSearch}`,
        label: `Add custom "${trimmedTypeSearch}"`,
        isCustom: true,
      });
    }

    return options;
  }, [billItemTypes, trimmedTypeSearch, canAddCustomType]);

  const handleTypeSearch = (value) => {
    setTypeSearch(value);
    setServiceItem((prev) => {
      const matched = (billItemTypes || []).find(
        (type) =>
          type?.name === prev.type &&
          (String(type?.displayName || type?.name).toLowerCase() ===
            value.trim().toLowerCase() ||
            type?.name?.toLowerCase() === value.trim().toLowerCase())
      );
      if (matched) return prev;
      return { ...prev, type: undefined };
    });
  };

  const handleAddCustomType = async (customName) => {
    const nameToCreate = String(customName || trimmedTypeSearch).trim();
    if (!nameToCreate || creatingType) return;
    const alreadyExists = (billItemTypes || []).some((type) => {
      const displayName = String(type?.displayName || "").toLowerCase();
      const name = String(type?.name || "").toLowerCase();
      const query = nameToCreate.toLowerCase();
      return displayName === query || name === query;
    });
    if (alreadyExists) return;

    setCreatingType(true);
    const created = await createBillItemType({ name: nameToCreate });
    const createdName = created?.name || nameToCreate;
    const createdDisplayName = created?.displayName || createdName;
    const refreshed = await getBillItemTypes();
    const nextTypes = Array.isArray(refreshed) ? refreshed : [];
    if (created?.id || created?.name) {
      const exists = nextTypes.some(
        (type) => type?.name === createdName || type?.id === created?.id
      );
      if (!exists) {
        nextTypes.push({
          ...created,
          name: createdName,
          displayName: createdDisplayName,
        });
      }
    }
    setBillItemTypes(nextTypes);
    handleServiceItem("type", createdName);
    setTypeSearch(createdDisplayName);
    setCreatingType(false);
  };

  const handleTypeSelect = (value, option) => {
    if (option?.isCustom) {
      const customName = String(value).replace(/^__add_custom__:/, "");
      handleAddCustomType(customName);
      return;
    }
    handleServiceItem("type", value);
    setTypeSearch(option?.label || value);
  };

  const handleDeleteBillItemType = async (typeId, typeName) => {
    if (!typeId || deletingTypeId) return;
    setDeletingTypeId(typeId);
    try {
      await deleteBillItemType(typeId);
      setBillItemTypes((prev) => prev.filter((type) => type?.id !== typeId));
      setServiceItem((prev) => {
        if (prev.type === typeName) {
          setTypeSearch("");
          return { ...prev, type: undefined };
        }
        return prev;
      });
    } finally {
      setDeletingTypeId(null);
    }
  };

  const addOrEditServieItem = async () => {
    if (editIndex === -1) {
      const clinic = getClinic();
      trackEvent("TP_Billing_Addnewseriviceadd", {
        doctorSpeciality: profile?.dp_name,
        doctorId: profile?.doctor_unique_id,
        doctorContact: profile?.um_contact,
        city: clinic?.hm_city,
        pincode: clinic?.hm_pincode,
        subscriptionStatus: planDetails?.currentPlanStatus,
        type: serviceItem?.type
      });
    }

    const finalItem = { ...serviceItem };
    finalItem.totalAmount = calculateTotalAmount(finalItem);
    handleServiceItem(finalItem);

    const billItemRes = await upsertBillItem({
      ...finalItem,
      discount: finalItem?.discount || undefined,
      gst: finalItem?.gst || undefined,
    });

    if (billItemRes?.id) {
      onSaved?.(billItemRes, finalItem);
      setDataSource?.((prev) => {
        const updatedData = [...prev];
        const updateIndex = editIndex > -1 ? editIndex : item?.index;

        if (updateIndex > -1 && updatedData[updateIndex]) {
          updatedData[updateIndex] = {
            ...billItemRes,
            ...updatedData[updateIndex], // Keep existing values
            masterId: billItemRes?.id,
            quantity: 1,
            name: finalItem?.name,
            amount: finalItem?.price,
            discount: finalItem?.discount,
            discountType: finalItem?.discountType,
            type: finalItem?.type,
            gst: finalItem?.gst,
            totalAmount: finalItem?.totalAmount,
            createdBy: billItemRes?.createdBy,
          };
          addRow &&
            updateIndex === prev?.length - 1 &&
            updatedData.push({
              masterId: "",
              name: "",
              quantity: "",
              amount: "",
              discount: "",
              discountType: "",
              gst: "",
              totalAmount: "",
              createdBy: "",
            });
        } else {
          // If no valid index, add a new item
          updatedData.push({
            masterId: billItemRes?.id,
            quantity: 1,
            name: finalItem?.name,
            amount: finalItem?.price,
            discount: finalItem?.discount,
            discountType: finalItem?.discountType,
            type: finalItem?.type,
            gst: finalItem?.gst,
            totalAmount: finalItem?.totalAmount,
            createdBy: billItemRes?.createdBy,
            ...billItemRes,
          });
        }
        return updatedData;
      });
      setSearchQuery?.("");
      onCancel();
    }
  };

  // Preview amount
  const previewItem = {
    ...serviceItem,
  };
  const totalAmount = calculateTotalAmount(previewItem);

  const typeOptions = dentalOnly
    ? BILL_ITEM_TYPE_OPTIONS.filter((o) => o.value === DENTAL_ONLY_TYPE)
    : BILL_ITEM_TYPE_OPTIONS;

  const serviceNameLabel =
    dentalOnly || serviceItem.type === DENTAL_ONLY_TYPE
      ? "Dental service name"
      : serviceItem.type === "Service"
        ? "Clinical service name"
        : serviceItem.type === "Consumables"
          ? "Consumable name"
          : "Service name";

  const isTypeSelected = dentalOnly
    ? serviceItem.type === DENTAL_ONLY_TYPE
    : !!serviceItem.type &&
      ((billItemTypes || []).some(
        (type) =>
          type?.name === serviceItem.type ||
          type?.displayName === serviceItem.type
      ) ||
        // Allow saving edited items whose type string is already set
        (editIndex > -1 && !!item?.type && item.type === serviceItem.type));

  const showTypeError =
    !dentalOnly &&
    !typesLoading &&
    !creatingType &&
    !!trimmedTypeSearch &&
    !isTypeSelected;

  const canSave =
    isTypeSelected &&
    !!String(serviceItem.name || "").trim() &&
    !!serviceItem.price &&
    !creatingType &&
    !typesLoading &&
    !deletingTypeId;

  return (
    <Drawer
      zIndex={zIndex}
      title={
        <div className="d-flex align-items-center gap-2">
          <span style={{ fontWeight: 600, fontSize: '16px', color: '#1A1A1A' }}>
            {dentalOnly
              ? editIndex === -1
                ? "Add dental service"
                : "Edit dental service"
              : editIndex === -1
                ? "Add new bill item"
                : "Edit bill item"}
          </span>
          <i className="fi fi-rr-info text-muted" style={{ fontSize: '14px', cursor: 'pointer' }}></i>
        </div>
      }
      placement="right"
      onClose={onCancel}
      open={true}
      width={500}
      closeIcon={<img src={closeIcon} alt="close" style={{ width: '24px', height: '24px', cursor: 'pointer'}} />}
      extra={
        <Button
          onClick={addOrEditServieItem}
          className="btn btn-primary3 px-4"
          style={{ height: '36px', borderRadius: '6px', background: '#5452F6', border: 'none' }}
          disabled={!canSave}
        >
          <span>Save</span>
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', overflowX: 'hidden' }}>
        <div className="d-flex flex-column gap-4" style={{ flex: 1 }}>

          {/* Clinical service name */}
          <div className="d-flex flex-column gap-2">
            <label className="text-muted mb-0" style={{ fontSize: '13px', fontWeight: 500, color: '#475467' }}>
              {serviceNameLabel} <span className="text-danger">*</span>
            </label>
            <Input
              autoFocus={editIndex === -1}
              value={serviceItem.name}
              placeholder="Search or type a name"
              style={{ height: 44, borderRadius: '8px' }}
              onChange={(e) => handleServiceItem("name", e.target.value)}
            />
          </div>

          {/* Type selection */}
          <div className="d-flex flex-column gap-2">
            <label className="d-flex align-items-center gap-2 text-muted mb-0" style={{ fontSize: '13px', fontWeight: 500 }}>
              Type <span className="text-danger">*</span>
              <i className="fi fi-rr-info" style={{ fontSize: '12px' }}></i>
            </label>
            {dentalOnly ? (
              <div
                style={{
                  background: '#F2F4F7',
                  borderRadius: '8px',
                  padding: '4px',
                  display: 'inline-flex',
                  alignSelf: 'flex-start',
                  width: 'fit-content',
                }}
              >
                {typeOptions.map((typeOption) => (
                  <div
                    key={typeOption.value}
                    style={{
                      flex: '0 0 auto',
                      textAlign: 'center',
                      padding: '8px 12px',
                      whiteSpace: 'nowrap',
                      fontSize: '13px',
                      fontWeight: serviceItem.type === typeOption.value ? 600 : 500,
                      color: serviceItem.type === typeOption.value ? '#1A1A1A' : '#667085',
                      background: serviceItem.type === typeOption.value ? '#FFFFFF' : 'transparent',
                      borderRadius: '6px',
                      cursor: 'default',
                      boxShadow: serviceItem.type === typeOption.value ? '0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {typeOption.label}
                  </div>
                ))}
              </div>
            ) : (
              <AutoComplete
                value={typeSearch}
                options={typeAutoCompleteOptions}
                onSearch={handleTypeSearch}
                onSelect={handleTypeSelect}
                defaultActiveFirstOption={false}
                className="w-100"
                notFoundContent={null}
                dropdownMatchSelectWidth
                optionRender={(option) => {
                  if (option.data?.isCustom) {
                    return (
                      <span style={{ color: "#5452F6", fontWeight: 600 }}>
                        {option.label}
                      </span>
                    );
                  }

                  const isDeletable = Number(option.data?.clinicId) !== 0;

                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        gap: 8,
                      }}
                    >
                      <span>{option.label}</span>
                      {isDeletable && (
                        <DeleteOutlined
                          style={{
                            color: deletingTypeId === option.data?.id ? "#98A2B3" : "#667085",
                            fontSize: 14,
                            flexShrink: 0,
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteBillItemType(option.data?.id, option.value);
                          }}
                        />
                      )}
                    </div>
                  );
                }}
              >
                <Input
                  placeholder="Search type"
                  status={showTypeError ? "error" : undefined}
                  style={{ height: 44, borderRadius: "8px" }}
                  disabled={typesLoading || creatingType || !!deletingTypeId}
                />
              </AutoComplete>
            )}
            {showTypeError && (
              <span style={{ color: "#ff4d4f", fontSize: 12, marginTop: 2 }}>
                Please select a type from the list or add a custom type
              </span>
            )}
          </div>

          {/* Price */}
          <div className="d-flex flex-column gap-2">
            <label className="text-muted mb-0" style={{ fontSize: '13px', fontWeight: 500, color: '#475467' }}>
              Price (₹) <span className="text-danger">*</span>
            </label>
            <Input
              value={serviceItem.price}
              placeholder="0"
              inputMode="decimal"
              onChange={(e) => {
                const price = onlyDecimalFormat(e.target.value);
                if (price <= 1000000000) {
                  handleServiceItem("price", price);
                }
              }}
              style={{ height: 44, borderRadius: '8px' }}
              prefix={<span style={{ color: '#475467', marginRight: '4px' }}>₹</span>}
            />
          </div>

          {/* Taxes & Discount */}
          <div className="d-flex gap-3">
            <div className="d-flex flex-column gap-2" style={{ flex: 1 }}>
              <label className="text-muted mb-0" style={{ fontSize: '13px', fontWeight: 500, color: '#475467' }}>
                GST (%)
              </label>
              <Input
                value={serviceItem.gst}
                placeholder="0"
                inputMode="decimal"
                onChange={(e) => {
                  const value = onlyDecimalFormat(e.target.value);
                  handleServiceItem("gst", value > 100 ? serviceItem.gst : value ? value : undefined);
                }}
                style={{ height: 44, borderRadius: '8px' }}
                suffix={<span style={{ color: '#475467' }}>%</span>}
              />
            </div>
            <div className="d-flex flex-column gap-2" style={{ flex: 1 }}>
              <label className="text-muted mb-0" style={{ fontSize: '13px', fontWeight: 500, color: '#475467' }}>
                Discount
              </label>
              <div style={{ position: 'relative' }}>
                <Input
                  value={serviceItem.discount}
                  placeholder="0"
                  inputMode="decimal"
                  onChange={(e) => {
                    const discount = onlyDecimalFormat(e.target.value);
                    if (
                      (serviceItem.discountType === "percentage" && discount <= 100) ||
                      (serviceItem.discountType === "flat" && Number(discount) <= Number(serviceItem.price))
                    ) {
                      handleServiceItem("discount", discount ? discount : undefined);
                    }
                  }}
                  style={{ height: 44, borderRadius: '8px', paddingRight: '56px' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '4px',
                    bottom: '4px',
                    background: '#F2F4F7',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px'
                  }}
                >
                  <div
                    onClick={() => handleServiceItem("discountType", "flat")}
                    style={{
                      padding: '2px 8px',
                      cursor: 'pointer',
                      background: serviceItem.discountType === 'flat' ? '#FFFFFF' : 'transparent',
                      borderRadius: '2px',
                      boxShadow: serviceItem.discountType === 'flat' ? '0px 1px 2px rgba(16, 24, 40, 0.05)' : 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: serviceItem.discountType === 'flat' ? '#1A1A1A' : '#667085'
                    }}
                  >
                    ₹
                  </div>
                  <div
                    onClick={() => handleServiceItem("discountType", "percentage")}
                    style={{
                      padding: '2px 8px',
                      cursor: 'pointer',
                      background: serviceItem.discountType === 'percentage' ? '#FFFFFF' : 'transparent',
                      borderRadius: '2px',
                      boxShadow: serviceItem.discountType === 'percentage' ? '0px 1px 2px rgba(16, 24, 40, 0.05)' : 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: serviceItem.discountType === 'percentage' ? '#1A1A1A' : '#667085'
                    }}
                  >
                    %
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto" style={{ borderTop: '1px solid #EAECF0', paddingTop: '20px', marginTop: '40px' }}>
          <div className="d-flex justify-content-between align-items-center">
            <span style={{ fontWeight: 600, color: '#475467', fontSize: '14px' }}>Total amount (incl. GST)</span>
            <span style={{ fontWeight: 600, color: '#1A1A1A', fontSize: '16px' }}>
              {totalAmount > 0 ? `₹ ${totalAmount}` : '-'}
            </span>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default ServiceItemPopup;
